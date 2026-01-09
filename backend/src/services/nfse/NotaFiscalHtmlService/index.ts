import { NotaFiscal } from '../../../models/nfse/NotaFiscal';
import { Cliente } from '../../../models/clientes/Cliente';
import { Titulo } from '../../../models/financeiro/Titulo';
import { Plano } from '../../../models/cadastros/Plano';
import { ContratoPlanoAdicional } from '../../../models/contratos/ContratoPlanoAdicional';
import { logger } from '../../../utils/logger';
import QRCode from 'qrcode';
import * as fs from 'fs';
import { resolveImagePath, resolveTemplatePath } from '../../../utils/pathUtils';
import { parseDateFromDb } from '../../../utils/dateUtils';
import { FinancialCalculationsService } from '../../FinancialCalculationsService';
import { DadosEmpresaService } from '../../sistema/DadosEmpresaService';
import { NFSeConfigService } from '../NFSeConfigService';
import { TituloService } from '../../financeiro/TituloService';
import { ContratoService } from '../../contratos/ContratoService';
import { ContratoPlanoAdicionalService } from '../../contratos/ContratoPlanoAdicionalService';

export class NotaFiscalHtmlService {
  /**
   * Processa HTML da NFS-e substituindo variáveis do template
   */
  static async processarNfseHtml(
    notaFiscal: NotaFiscal & { cliente?: Cliente | null }
  ): Promise<string> {
    if (!notaFiscal.cliente) {
      throw new Error('Cliente não encontrado para a nota fiscal');
    }

    const dadosEmpresa = await DadosEmpresaService.findOne();
    if (!dadosEmpresa) {
      throw new Error('Dados da empresa não configurados');
    }

    const nfseConfig = await NFSeConfigService.get();
    const descricaoServico = nfseConfig?.descricao_servico || '';

    const servicos: Array<{
      nome: string;
      valor: number;
      desconto: number;
      valorFinal: number;
    }> = [];

    if (notaFiscal.titulo_id) {
      const titulo = await TituloService.getById(notaFiscal.titulo_id) as (Titulo & { plano?: Plano }) | null;

      if (titulo && titulo.plano) {
        const valorPlano = Number(titulo.plano.valor_mensal);
        let valorFinal = valorPlano;

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

        if (titulo.contrato_id) {
          const contrato = await ContratoService.getById(titulo.contrato_id);

          if (contrato) {
            const planosAdicionais = await ContratoPlanoAdicionalService.getByContrato(contrato.id);
            const planosAtivos = planosAdicionais.filter(p => p.status === 'ativo') as Array<ContratoPlanoAdicional & { plano?: Plano }>;

            for (const planoAdicional of planosAtivos) {
              if (planoAdicional.plano) {
                const valorPlanoAdicional = Number(planoAdicional.plano.valor_mensal);
                let valorFinalAdicional = valorPlanoAdicional;

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

    const formatarDataHora = (data: Date | string | null | undefined): string => {
      if (!data) return '';
      try {
        const dateToFormat = data instanceof Date ? data : (parseDateFromDb(data) || new Date());
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
    const logoPath = resolveImagePath('sistema', 'logo-nfse-assinatura-horizontal.svg');

    if (fs.existsSync(logoPath)) {
      try {
        const logoSvg = fs.readFileSync(logoPath, 'utf-8');
        logoNfseBase64 = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;
      } catch (error) {
        logger.error('Erro ao ler logo NFS-e', {
          nota_id: notaFiscal.id,
          logoPath,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    const templatePath = resolveTemplatePath('nfse.html');
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

    Object.entries(templateVars).forEach(([key, value]) => {
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), String(value || ''));
    });

    return template;
  }
}
