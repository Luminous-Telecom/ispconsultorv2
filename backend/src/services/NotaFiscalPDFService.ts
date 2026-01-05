import * as fs from 'fs';
import * as path from 'path';
import QRCode from 'qrcode';
import { NotaFiscal } from '../models/NotaFiscal';
import { NFSeConfig } from '../models/NFSeConfig';
import { Cliente } from '../models/Cliente';
import { DadosEmpresa } from '../models/DadosEmpresa';
import { Titulo } from '../models/Titulo';
import { Plano } from '../models/Plano';
import { Contrato } from '../models/Contrato';
import { ContratoPlanoAdicional } from '../models/ContratoPlanoAdicional';
import { logger } from '../utils/logger';
import { formatDate, parseDateFromDb } from '../utils/dateUtils';
import { PDFGenerationService } from './pdf-generation/PDFGenerationService';
import { FinancialCalculationsService } from './FinancialCalculationsService';

export class NotaFiscalPDFService {
  /**
   * Gera PDF da NFS-e a partir dos dados do banco
   */
  static async gerarPdf(notaFiscal: NotaFiscal & { cliente?: Cliente | null }): Promise<Buffer> {
    try {
      logger.info('Iniciando geração de PDF da NFS-e', {
        nota_id: notaFiscal.id
      });

      const html = await NotaFiscalPDFService.processarNfseHtml(notaFiscal);

      logger.debug('HTML processado para PDF', {
        nota_id: notaFiscal.id,
        htmlLength: html.length,
        hasLogoInHtml: html.includes('data:image/svg+xml;base64,'),
        hasImgTag: html.includes('<img'),
        logoImgTags: (html.match(/<img[^>]*src="[^"]*data:image\/svg\+xml;base64,[^"]*"[^>]*>/g) || []).length
      });

      const pdfBuffer = await PDFGenerationService.generateFromHtml(html, 'html-pdf-node', {
        format: 'A4',
        margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
        printBackground: true
      });

      logger.info('PDF gerado com sucesso', {
        nota_id: notaFiscal.id,
        pdfSize: pdfBuffer.length
      });

      return pdfBuffer;
    } catch (error) {
      logger.error('Erro ao gerar PDF da NFS-e no NotaFiscalPDFService', {
        nota_id: notaFiscal.id,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Processa HTML da NFS-e substituindo variáveis do template
   */
  private static async processarNfseHtml(notaFiscal: NotaFiscal & { cliente?: Cliente | null }): Promise<string> {
    
    if (!notaFiscal.cliente) {
      throw new Error('Cliente não encontrado para a nota fiscal');
    }

    const dadosEmpresa = await DadosEmpresa.findOne();
    if (!dadosEmpresa) {
      throw new Error('Dados da empresa não configurados');
    }

    const nfseConfig = await NFSeConfig.findOne();
    const descricaoServico = nfseConfig?.descricao_servico || '';

    // Buscar serviços (plano principal e adicionais)
    const servicos: Array<{
      nome: string;
      valor: number;
      desconto: number;
      valorFinal: number;
    }> = [];

    if (notaFiscal.titulo_id) {

      const titulo = await Titulo.findByPk(notaFiscal.titulo_id, {
        include: [
          {
            model: Plano,
            as: 'plano',
            attributes: ['id', 'nome_plano', 'valor_mensal']
          }
        ]
      }) as (Titulo & { plano?: Plano }) | null;

      if (titulo && titulo.plano) {
        const valorPlano = Number(titulo.plano.valor_mensal);
        let valorFinal = valorPlano;

        // Usar valor final do título
        if (titulo.valor_final) {
          valorFinal = Number(titulo.valor_final);
        }

        const descontoTotal = Math.max(0, valorPlano - valorFinal);
        servicos.push({
          nome: titulo.plano.nome_plano,
          valor: valorPlano,
          desconto: descontoTotal,
          valorFinal: valorFinal
        });

        // Buscar planos adicionais do contrato se existir
        if (titulo.contrato_id) {
          const contrato = await Contrato.findByPk(titulo.contrato_id);
          
          if (contrato) {

            // Buscar planos adicionais
            const planosAdicionais = await ContratoPlanoAdicional.findAll({
              where: {
                contrato_id: contrato.id,
                status: 'ativo'
              },
              include: [
                {
                  model: Plano,
                  as: 'plano',
                  attributes: ['id', 'nome_plano', 'valor_mensal']
                }
              ]
            }) as Array<ContratoPlanoAdicional & { plano?: Plano }>;

            for (const planoAdicional of planosAdicionais) {
              if (planoAdicional.plano) {
                const valorPlanoAdicional = Number(planoAdicional.plano.valor_mensal);
                let valorFinalAdicional = valorPlanoAdicional;
                
                // Usar valor_final do contrato_plano_adicional se disponível, senão calcular
                if (planoAdicional.valor_final) {
                  valorFinalAdicional = Number(planoAdicional.valor_final);
                } else {
                  valorFinalAdicional = FinancialCalculationsService.calcularValorFinal(
                    valorPlanoAdicional,
                    {
                      desconto_valor: planoAdicional.desconto_valor,
                      desconto_percentual: planoAdicional.desconto_percentual
                    }
                  );
                }
                
                const descontoTotalAdicional = Math.max(0, valorPlanoAdicional - valorFinalAdicional);
                servicos.push({
                  nome: planoAdicional.plano.nome_plano,
                  valor: valorPlanoAdicional,
                  desconto: descontoTotalAdicional,
                  valorFinal: valorFinalAdicional
                });
              }
            }
          }
        }
      }
    }

    // Se não encontrou serviços, usar valor padrão
    if (servicos.length === 0) {
      const valorServicos = Number(notaFiscal.valor_servicos || notaFiscal.valor_total);
      const valorDesconto = Number(notaFiscal.valor_desconto || 0);
      const valorFinal = Number(notaFiscal.valor_total);
      servicos.push({
        nome: 'Serviço',
        valor: valorServicos,
        desconto: valorDesconto,
        valorFinal: valorFinal
      });
    }

    const formatarData = (data: Date | string | null | undefined): string => {
      if (!data) return '';
      try {
        return formatDate(data instanceof Date ? data : parseDateFromDb(data)) || '';
      } catch {
        return '';
      }
    };

    const formatarDataHora = (data: Date | string | null | undefined): string => {
      if (!data) return '';
      try {
        const dateToFormat = data instanceof Date ? data : parseDateFromDb(data);
        if (!dateToFormat || isNaN(dateToFormat.getTime())) return '';

        const day = String(dateToFormat.getDate()).padStart(2, '0');
        const month = String(dateToFormat.getMonth() + 1).padStart(2, '0');
        const year = dateToFormat.getFullYear();
        const hour = String(dateToFormat.getHours()).padStart(2, '0');
        const minute = String(dateToFormat.getMinutes()).padStart(2, '0');
        const second = String(dateToFormat.getSeconds()).padStart(2, '0');

            return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
      } catch {
        return '';
      }
    };

    const formatarStatus = (status: string | null | undefined): string => {
      const statusMap: Record<string, string> = {
        'PENDENTE': 'Pendente',
        'PROCESSANDO': 'Processando',
        'AUTORIZADA': 'Autorizada',
        'CANCELADA': 'Cancelada',
        'REJEITADA': 'Rejeitada',
        'ERRO': 'Erro'
      };
      return statusMap[status || ''] || status || 'Pendente';
    };

    let qrCodeImage = '';
    if (notaFiscal.chave_acesso) {
      try {
        const urlConsulta = `https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${notaFiscal.chave_acesso}`;
        const qrCodeDataUrl = await QRCode.toDataURL(urlConsulta, { width: 100, margin: 1, errorCorrectionLevel: 'M' });
        qrCodeImage = `<img src="${qrCodeDataUrl}" style="max-width: 100px; max-height: 100px; display: block; margin: 0 auto;" />`;
      } catch {
        // QR Code opcional, continua sem ele
      }
    }

    let logoNfseBase64 = '';
    const logoFileName = 'logo-nfse-assinatura-horizontal.svg';

    // Usar mesma lógica dos boletos para consistência
    const imagesPath = path.join(__dirname, '../../images/sistema');
    const logoPath = fs.existsSync(imagesPath) ? path.join(imagesPath, logoFileName) : path.join(process.cwd(), 'images/sistema', logoFileName);

    console.log('DEBUG LOGO NFS-E - Tentando carregar logo:', {
      nota_id: notaFiscal.id,
      __dirname,
      processCwd: process.cwd(),
      imagesPath,
      imagesPathExists: fs.existsSync(imagesPath),
      logoPath,
      logoPathExists: fs.existsSync(logoPath)
    });

    logger.error('DEBUG LOGO NFS-E - Tentando carregar logo', {
      nota_id: notaFiscal.id,
      __dirname,
      processCwd: process.cwd(),
      imagesPath,
      imagesPathExists: fs.existsSync(imagesPath),
      logoPath,
      logoPathExists: fs.existsSync(logoPath)
    });

    if (fs.existsSync(logoPath)) {
      try {
        const logoSvg = fs.readFileSync(logoPath, 'utf-8');
        logoNfseBase64 = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;
        console.log('DEBUG LOGO NFS-E - Logo carregada com sucesso:', {
          nota_id: notaFiscal.id,
          logoPath,
          logoSize: logoSvg.length
        });

        logger.error('DEBUG LOGO NFS-E - Logo carregada com sucesso', {
          nota_id: notaFiscal.id,
          logoPath,
          logoSize: logoSvg.length
        });
      } catch (error) {
        console.log('DEBUG LOGO NFS-E - Erro ao ler logo:', {
          nota_id: notaFiscal.id,
          logoPath,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });

        logger.error('DEBUG LOGO NFS-E - Erro ao ler logo', {
          nota_id: notaFiscal.id,
          logoPath,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    } else {
      console.log('DEBUG LOGO NFS-E - Logo não encontrada:', {
        nota_id: notaFiscal.id,
        logoPath
      });

      logger.error('DEBUG LOGO NFS-E - Logo não encontrada', {
        nota_id: notaFiscal.id,
        logoPath
      });
    }

    const templatePath = path.join(__dirname, '../templates/nfse.html');
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template não encontrado: ${templatePath}`);
    }
    
    let template = fs.readFileSync(templatePath, 'utf-8');

    const codigoServicoMunicipal = nfseConfig?.codigo_servico_municipal || '';
    
    const criarSecaoRow = (label: string, value: string): string => 
      `<div class="row"><span class="row-label">${label}:</span><span class="row-value">${value}</span></div>`;

    const formatarValor = (valor: number | null | undefined): string => {
      if (!valor && valor !== 0) return 'R$ 0,00';
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor));
    };

    const cliente = notaFiscal.cliente;
    const logoNfseHtml = logoNfseBase64 ? `<img src="${logoNfseBase64}" style="max-width: 200px; height: auto; display: block; margin: 0 auto 10px;" />` : '';

    console.log('DEBUG LOGO NFS-E - logoNfseBase64 preview:', logoNfseBase64.substring(0, 100) + '...');
    console.log('DEBUG LOGO NFS-E - logoNfseHtml:', logoNfseHtml);

    logger.error('DEBUG LOGO NFS-E - Processando template', {
      nota_id: notaFiscal.id,
      hasLogo: !!logoNfseBase64,
      logoNfseBase64Length: logoNfseBase64.length,
      logoNfseHtmlLength: logoNfseHtml.length
    });

    const templateVars: Record<string, string> = {
      LOGO_NFSE: logoNfseHtml,
      EMPRESA_RAZAO_SOCIAL: dadosEmpresa.razao_social || '',
      EMPRESA_CNPJ: dadosEmpresa.cnpj || '',
      EMPRESA_INSCRICAO_MUNICIPAL: dadosEmpresa.inscricao_municipal || '',
      EMPRESA_ENDERECO: dadosEmpresa.endereco || '',
      EMPRESA_NUMERO: dadosEmpresa.numero || '',
      EMPRESA_COMPLEMENTO: dadosEmpresa.complemento || '',
      EMPRESA_BAIRRO: dadosEmpresa.bairro || '',
      EMPRESA_CEP: dadosEmpresa.cep || '',
      EMPRESA_CIDADE: dadosEmpresa.cidade || '',
      EMPRESA_ESTADO: dadosEmpresa.estado || '',
      EMPRESA_TELEFONE: dadosEmpresa.telefone || dadosEmpresa.celular || '',
      EMPRESA_EMAIL: dadosEmpresa.email || '',
      NUMERO: notaFiscal.numero || notaFiscal.id.toString(),
      SERIE: notaFiscal.serie || '1',
      DATA_EMISSAO: formatarDataHora(notaFiscal.data_emissao),
      STATUS: formatarStatus(notaFiscal.status),
      CLIENTE_RAZAO_SOCIAL: cliente.razao_social || '',
      CLIENTE_NOME_FANTASIA: cliente.nome_fantasia || '',
      CLIENTE_CNPJ: cliente.cnpj || '',
      CLIENTE_INSCRICAO_ESTADUAL: '',
      CLIENTE_ENDERECO: cliente.endereco || '',
      CLIENTE_NUMERO: cliente.numero || '',
      CLIENTE_COMPLEMENTO: cliente.complemento || '',
      CLIENTE_BAIRRO: cliente.bairro || '',
      CLIENTE_CEP: cliente.cep || '',
      CLIENTE_CIDADE: cliente.cidade || '',
      CLIENTE_ESTADO: cliente.estado || '',
      CLIENTE_TELEFONE: cliente.telefone || '',
      CLIENTE_EMAIL: cliente.email || '',
      DESCRICAO: descricaoServico,
      OBSERVACOES: notaFiscal.observacoes || '',
      NATUREZA_OPERACAO: notaFiscal.natureza_operacao || '',
      CODIGO_SERVICO_MUNICIPAL: codigoServicoMunicipal,
      VALOR_TOTAL_FORMATADO: formatarValor(notaFiscal.valor_total),
      VALOR_SERVICOS_FORMATADO: formatarValor(notaFiscal.valor_servicos),
      VALOR_PRODUTOS_FORMATADO: formatarValor(notaFiscal.valor_produtos),
      VALOR_DESCONTO_FORMATADO: formatarValor(notaFiscal.valor_desconto),
      ALIQUOTA_ISS: notaFiscal.aliquota_iss ? Number(notaFiscal.aliquota_iss).toFixed(2) : '0,00',
      VALOR_ISS_FORMATADO: formatarValor(notaFiscal.valor_iss),
      CHAVE_ACESSO: notaFiscal.chave_acesso || '',
      PROTOCOLO: notaFiscal.protocolo || '',
      DATA_AUTORIZACAO: formatarDataHora(notaFiscal.data_autorizacao),
      QR_CODE: qrCodeImage,
      EMPRESA_INSCRICAO_MUNICIPAL_SECTION: dadosEmpresa.inscricao_municipal 
        ? criarSecaoRow('Inscrição Municipal', dadosEmpresa.inscricao_municipal) 
        : '',
      CLIENTE_INSCRICAO_ESTADUAL_SECTION: '',
      OBSERVACOES_SECTION: notaFiscal.observacoes ? criarSecaoRow('Observações', notaFiscal.observacoes) : '',
      PROTOCOLO_SECTION: notaFiscal.protocolo 
        ? `<div class="protocolo"><strong>Protocolo de Autorização:</strong> ${notaFiscal.protocolo}</div>` 
        : '',
      DATA_AUTORIZACAO_SECTION: notaFiscal.data_autorizacao 
        ? criarSecaoRow('Data e Hora de Autorização', formatarDataHora(notaFiscal.data_autorizacao)) 
        : ''
    };

    // Substituir variáveis no template
    let totalVariablesProcessed = 0;
    let totalReplacements = 0;

    Object.entries(templateVars).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      const matchesBefore = (template.match(regex) || []).length;
      template = template.replace(regex, String(value || ''));
      const matchesAfter = (template.match(regex) || []).length;

      totalVariablesProcessed++;
      totalReplacements += matchesBefore;

      // Log específico para LOGO_NFSE
      if (key === 'LOGO_NFSE') {
        console.log('DEBUG LOGO NFS-E - Substituição LOGO_NFSE:', {
          nota_id: notaFiscal.id,
          matchesBefore,
          matchesAfter,
          valueLength: String(value || '').length,
          valuePreview: String(value || '').substring(0, 150) + '...'
        });
      }
    });

    logger.debug('Variáveis do template processadas', {
      nota_id: notaFiscal.id,
      totalVariables: totalVariablesProcessed,
      totalReplacements
    });

    // Validar template processado
    const remainingVariables = template.match(/\{\{[^}]+\}\}/g) || [];
    const hasLogoInFinalHtml = template.includes('data:image/svg+xml;base64,');

    console.log('DEBUG LOGO NFS-E - Template final contém logo?', {
      nota_id: notaFiscal.id,
      hasLogoInFinalHtml,
      logoSection: template.includes('<img src="data:image/svg+xml;base64,') ? 'SIM - img tag encontrada' : 'NAO - img tag não encontrada'
    });

    logger.error('DEBUG LOGO NFS-E - Template final', {
      nota_id: notaFiscal.id,
      hasLogoInFinalHtml,
      logoSectionLength: template.includes('<img src="data:image/svg+xml;base64,') ?
        template.substring(template.indexOf('<img src="data:image/svg+xml;base64,'), template.indexOf('<img src="data:image/svg+xml;base64,') + 200) + '...' :
        'Logo não encontrada no template'
    });

    logger.info('Template NFSe processado', {
      nota_id: notaFiscal.id,
      templateLength: template.length,
      hasLogo: hasLogoInFinalHtml
    });

    if (remainingVariables.length > 0) {
      logger.warn('Variáveis não substituídas no template NFSe', {
        nota_id: notaFiscal.id,
        count: remainingVariables.length,
        variables: remainingVariables.slice(0, 3)
      });
    }

    return template;
  }
}

