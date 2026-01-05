import * as fs from 'fs';
import * as path from 'path';
import QRCode from 'qrcode';
import { NotaFiscal } from '../models/NotaFiscal';
import { Cliente } from '../models/Cliente';
import { DadosEmpresa } from '../models/DadosEmpresa';
import { Titulo } from '../models/Titulo';
import { Plano } from '../models/Plano';
import { ContratoPlanoAdicional } from '../models/ContratoPlanoAdicional';
import { logger } from '../utils/logger';
import { formatDate, formatDateTime, parseDateFromDb } from '../utils/dateUtils';
import { PDFGenerationService } from './pdf-generation/PDFGenerationService';

export class NotaFiscalPDFService {
  /**
   * Gera PDF da NFS-e a partir dos dados do banco
   */
  static async gerarPdf(notaFiscal: NotaFiscal & { cliente?: Cliente | null }): Promise<Buffer> {
    try {
      const html = await NotaFiscalPDFService.processarNfseHtml(notaFiscal);
      return await PDFGenerationService.generateFromHtml(html, 'html-pdf-node', {
        format: 'A4',
        margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
        printBackground: true
      });
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

    const { NFSeConfig } = await import('../models/NFSeConfig');
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
      const { Contrato } = await import('../models/Contrato');

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
        const { FinancialCalculationsService } = await import('./FinancialCalculationsService');
        const valorPlano = Number(titulo.plano.valor_mensal);
        let valorFinal = valorPlano;

        // Buscar contrato para pegar os descontos
        if (titulo.contrato_id) {
          const contrato = await Contrato.findByPk(titulo.contrato_id);
          
          if (contrato) {
            // Calcular valor final do plano principal usando descontos do contrato
            if (contrato.valor_final) {
              valorFinal = Number(contrato.valor_final);
            } else {
              valorFinal = FinancialCalculationsService.calcularValorFinal(
                valorPlano,
                {
                  desconto_valor: contrato.desconto_valor,
                  desconto_percentual: contrato.desconto_percentual
                }
              );
            }

            const descontoTotal = Math.max(0, valorPlano - valorFinal);
            servicos.push({
              nome: titulo.plano.nome_plano,
              valor: valorPlano,
              desconto: descontoTotal,
              valorFinal: valorFinal
            });

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
        
        // Se não adicionou serviço ainda (sem contrato), adicionar plano principal
        if (servicos.length === 0) {
          const descontoTotal = Math.max(0, valorPlano - valorFinal);
          servicos.push({
            nome: titulo.plano.nome_plano,
            valor: valorPlano,
            desconto: descontoTotal,
            valorFinal: valorFinal
          });
        }
      }
    }

    // Se não encontrou serviços, usar descrição padrão
    if (servicos.length === 0) {
      const valorServicos = Number(notaFiscal.valor_servicos || notaFiscal.valor_total);
      const valorDesconto = Number(notaFiscal.valor_desconto || 0);
      const valorFinal = Number(notaFiscal.valor_total);
      servicos.push({
        nome: notaFiscal.descricao || descricaoServico,
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
        return formatDateTime(data instanceof Date ? data : parseDateFromDb(data)) || '';
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
    const logoPath = path.join(__dirname, '../../images/bancos/logo-nfse-assinatura-horizontal.svg');
    if (fs.existsSync(logoPath)) {
      try {
        const logoSvg = fs.readFileSync(logoPath, 'utf-8');
        logoNfseBase64 = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;
      } catch {
        // Logo opcional, continua sem ele
      }
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

    // Gerar HTML da tabela de serviços
    const gerarTabelaServicos = (): string => {
      if (servicos.length === 0) {
        const valorServicos = Number(notaFiscal.valor_servicos || notaFiscal.valor_total);
        const valorDesconto = Number(notaFiscal.valor_desconto || 0);
        const valorFinal = Number(notaFiscal.valor_total);
        return `
          <tr>
            <td>${notaFiscal.descricao || descricaoServico}</td>
            <td>1</td>
            <td>${formatarValor(valorServicos)}</td>
            <td>${formatarValor(valorDesconto)}</td>
            <td>${formatarValor(valorFinal)}</td>
          </tr>
        `;
      }

      return servicos.map(servico => `
        <tr>
          <td>${servico.nome}</td>
          <td>1</td>
          <td>${formatarValor(servico.valor)}</td>
          <td>${formatarValor(servico.desconto)}</td>
          <td>${formatarValor(servico.valorFinal)}</td>
        </tr>
      `).join('');
    };

    const cliente = notaFiscal.cliente;
    const templateVars: Record<string, string> = {
      LOGO_NFSE: logoNfseBase64 ? `<img src="${logoNfseBase64}" style="max-width: 200px; height: auto; display: block; margin: 0 auto 10px;" />` : '',
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
      DESCRICAO: notaFiscal.descricao || descricaoServico,
      OBSERVACOES: notaFiscal.observacoes || '',
      NATUREZA_OPERACAO: notaFiscal.natureza_operacao || '',
      CODIGO_SERVICO_MUNICIPAL: codigoServicoMunicipal,
      SERVICOS_TABLE_ROWS: gerarTabelaServicos(),
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

    Object.entries(templateVars).forEach(([key, value]) => {
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), String(value || ''));
    });

    return template;
  }
}

