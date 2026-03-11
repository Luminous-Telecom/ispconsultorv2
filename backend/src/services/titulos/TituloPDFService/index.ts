import * as fs from 'fs';
import puppeteer from 'puppeteer';
import { logger } from '../../../utils/logger';
import { DadosEmpresaService } from '../../sistema/DadosEmpresaService';
import { BarcodeService } from '../../bancos/BarcodeService';
import { parseDateFromDb, formatDate } from '../../../utils/dateUtils';
import { resolveTemplatePath } from '../../../utils/pathUtils';
import type { TituloComRelacoes } from '../../../controllers/titulos/TituloHelpers/types';
import { converterLogoParaBase64, getLogoBancoPadrao, processarInstrucao } from '../../../controllers/titulos/TituloHelpers';

export class TituloPDFService {
  /**
   * Gera PDF em base64 para um título
   */
  static async gerarPdfBase64(titulo: TituloComRelacoes): Promise<string | null> {
    try {
      const html = await this.processarBoletoHtml(titulo);
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'a4',
        printBackground: true,
        margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' }
      });

      await browser.close();
      
      if (Buffer.isBuffer(pdfBuffer)) {
        return pdfBuffer.toString('base64');
      }
      return Buffer.from(pdfBuffer).toString('base64');
      
    } catch (error: unknown) {
      let errorMessage = 'Erro desconhecido';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || 'Erro ao gerar PDF';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      logger.error('Erro ao gerar PDF do boleto:', errorMessage);
      return null;
    }
  }

  /**
   * Processa HTML do boleto substituindo variáveis do template
   */
  static async processarBoletoHtml(titulo: TituloComRelacoes): Promise<string> {
    try {
      if (!titulo) {
        logger.error('Título não fornecido ao processar HTML');
        throw new Error('Título não fornecido');
      }
      
      if (!titulo.cliente) {
        logger.error(`[processarBoletoHtml] ERRO: Cliente não encontrado - Título ID: ${titulo.id}`);
        throw new Error('Cliente não encontrado para o título');
      }
      
      if (!titulo.banco) {
        logger.error(`[processarBoletoHtml] ERRO: Banco não encontrado - Título ID: ${titulo.id}`);
        throw new Error('Banco não encontrado para o título');
      }
      
      const empresaId = (titulo as { empresa_id?: number | null }).empresa_id ?? undefined;
      const dadosEmpresa = await DadosEmpresaService.findOne(empresaId);
      if (!dadosEmpresa) {
        throw new Error('Dados da empresa não configurados');
      }

      const dataVencimento = formatDate(parseDateFromDb(titulo.data_vencimento)) || '';
      const dataProcessamento = formatDate(new Date()) || '';
      const valorBoleto = Number(titulo.valor || 0).toFixed(2).replace('.', ',');
      
      const topoTemplatePath = resolveTemplatePath('boleto-topo-inner.html');
      const corpoTemplatePath = resolveTemplatePath('boleto-corpo-inner.html');
      
      if (!fs.existsSync(topoTemplatePath)) {
        throw new Error(`Template não encontrado: ${topoTemplatePath}`);
      }
      
      if (!fs.existsSync(corpoTemplatePath)) {
        throw new Error(`Template não encontrado: ${corpoTemplatePath}`);
      }
      
      const topoTemplate = fs.readFileSync(topoTemplatePath, 'utf8');
      const corpoTemplate = fs.readFileSync(corpoTemplatePath, 'utf8');

      let logoBanco = '';
      let logoEmpresa = '';
      
      try {
        if (titulo.banco?.tipo_banco) {
          logoBanco = getLogoBancoPadrao(titulo.banco.tipo_banco);
        }
        logoEmpresa = converterLogoParaBase64(dadosEmpresa.logo || '');
      } catch (error) {
        logger.error('Erro ao processar logos', {
          titulo_id: titulo.id,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
        logoBanco = '';
        logoEmpresa = '';
      }

      let codigoBancoComDV = '364-9';
      try {
        if (titulo.banco?.codigo) {
          const dv = BarcodeService.calcularDVCodigoBanco(titulo.banco.codigo);
          codigoBancoComDV = `${titulo.banco.codigo}-${dv}`;
        }
      } catch (error) {
        logger.warn('Erro ao calcular DV do código do banco', {
          titulo_id: titulo.id,
          codigo_banco: titulo.banco?.codigo,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }

      const processarInstrucaoSegura = (instrucao: string | null | undefined): string => {
        try {
          return processarInstrucao(instrucao || '', titulo);
        } catch (error) {
          logger.warn('Erro ao processar instrução', {
            titulo_id: titulo.id,
            instrucao,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
          return instrucao || '';
        }
      };

      let boletoBarcode2 = '';
      try {
        if (titulo.codigo_barras) {
          boletoBarcode2 = BarcodeService.generateFebrabanBarcodeSvg(titulo.codigo_barras);
        }
      } catch (error) {
        logger.warn('Erro ao gerar código de barras SVG', {
          titulo_id: titulo.id,
          codigo_barras: titulo.codigo_barras,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
        boletoBarcode2 = '';
      }

      const templateVars = {
        LOGOMARCA: logoEmpresa,
        CEDENTE: dadosEmpresa.razao_social || dadosEmpresa.nome_fantasia || 'Empresa não configurada',
        EMPRESACPF: dadosEmpresa.cnpj || '',
        EMPRESAENDERECO: `${dadosEmpresa.endereco || ''} ${dadosEmpresa.numero || ''}`.trim(),
        EMPRESABAIRRO: dadosEmpresa.bairro || '',
        EMPRESACEP: dadosEmpresa.cep || '',
        EMPRESACIDADE: dadosEmpresa.cidade || '',
        EMPRESAESTADO: dadosEmpresa.estado || '',
        LOGOBANCO: logoBanco,
        CODIGO_BANCO_COM_DV: codigoBancoComDV,
        LINHA_DIGITAVEL: titulo.linha_digitavel || titulo.codigo_barras || '',
        AGENCIA_CODIGO: titulo.banco?.codigo || 'Não configurado',
        LOCAL_PAGAMENTO: 'Pagável em qualquer banco até o vencimento',
        DATA_VENC: dataVencimento,
        DATA_DOCUMENTO: dataProcessamento,
        NUMERO_DOCUMENTO: titulo.nosso_numero || titulo.numero_titulo || titulo.id?.toString() || '',
        ESPECIE_DOC: 'DM',
        DATA_PROC: dataProcessamento,
        NOSSO_NUMERO: titulo.nosso_numero || titulo.charge_id || '',
        CARTEIRA: 'SR',
        VAR_CARTEIRA: '',
        ESPECIE: 'R$',
        VALOR_BOLETO: valorBoleto,
        SACADO_NOME: titulo.cliente?.razao_social || titulo.cliente?.nome || '',
        TIPO_PSACADO: titulo.cliente?.cnpj ? 'CNPJ' : 'CPF',
        SACADO_CPF: titulo.cliente?.cnpj || titulo.cliente?.cpf || '',
        SACADO_ENDERECO: `${titulo.cliente?.endereco || ''} ${titulo.cliente?.numero || ''}`.trim(),
        SACADO_BAIRRO: titulo.cliente?.bairro || '',
        SACADO_COMPLEMENTO: titulo.cliente?.complemento || '',
        SACADO_CIDADE: titulo.cliente?.cidade || '',
        SACADO_ESTADO: titulo.cliente?.estado || '',
        SACADO_CEP: titulo.cliente?.cep || '',
        SACADO_IDNOME: titulo.cliente?.razao_social || titulo.cliente?.nome || '',
        NOME_PLANO: titulo.plano?.nome_plano || '',
        DESCRICAO_PLANO: titulo.plano?.descricao || '',
        TIPO_SERVICO: titulo.plano?.tipo_servico || '',
        QUANTIDADE_USUARIOS: titulo.plano?.quantidade_usuarios || '1',
        VALOR_PLANO: valorBoleto,
        PERIODICIDADE: (() => {
          const labels: Record<string, string> = {
            mensal: 'Mensal',
            bimestral: 'Bimestral',
            trimestral: 'Trimestral',
            semestral: 'Semestral',
            anual: 'Anual',
            quinzenal: 'Quinzenal',
            semanal: 'Semanal'
          };
          const p = titulo.plano?.periodicidade;
          return p ? (labels[p] || p) : 'Mensal';
        })(),
        TEXTO_MULTAMORA: titulo.banco?.percentual_multa || titulo.banco?.percentual_juros ? 
          `Multa de ${titulo.banco?.percentual_multa || 2}% + Juros de ${titulo.banco?.percentual_juros || 0.033}% ao dia após o vencimento` : '',
        INSTRUCOES1: processarInstrucaoSegura(titulo.banco?.instrucao_linha_1),
        INSTRUCOES2: processarInstrucaoSegura(titulo.banco?.instrucao_linha_2),
        INSTRUCOES3: processarInstrucaoSegura(titulo.banco?.instrucao_linha_3),
        INSTRUCOES4: processarInstrucaoSegura(titulo.banco?.instrucao_linha_4),
        INSTRUCOES5: processarInstrucaoSegura(titulo.banco?.instrucao_linha_5),
        QRCODE: titulo.qrcode_image || '',
        QRCODE_HTML: titulo.qrcode_image
          ? `<img src="${titulo.qrcode_image}" style="width: 100px; height: 100px; max-width: 100px; max-height: 100px;" /><br><span style="font-size: 8px; font-weight: bold;">PIX - Pagamento Instantâneo</span>`
          : '<div style="color: #666; font-size: 8px;">QR Code PIX<br>Não disponível</div>',
        BOLETO_BARCODE2: boletoBarcode2
      };

      let topoProcessado = topoTemplate;
      let corpoProcessado = corpoTemplate;
      
      Object.entries(templateVars).forEach(([key, value]) => {
        try {
          const regex = new RegExp(`{{${key}}}`, 'g');
          const valorSeguro = value !== null && value !== undefined ? String(value) : '';
          topoProcessado = topoProcessado.replace(regex, valorSeguro);
          corpoProcessado = corpoProcessado.replace(regex, valorSeguro);
        } catch (error) {
          logger.warn('Erro ao substituir variável no template', {
            key,
            titulo_id: titulo.id,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      });

      return `${topoProcessado}${corpoProcessado}`;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      const detalhesErro = {
        titulo_id: titulo?.id,
        error_message: errorMessage,
        error_name: error instanceof Error ? error.name : 'Unknown',
        error_stack: errorStack,
        has_titulo: !!titulo,
        has_cliente: !!titulo?.cliente,
        has_banco: !!titulo?.banco,
        banco_id: titulo?.banco?.id,
        banco_tipo: titulo?.banco?.tipo_banco,
        banco_codigo: titulo?.banco?.codigo,
        banco_nome: titulo?.banco?.nome,
        cliente_id: titulo?.cliente?.id,
        cliente_nome: titulo?.cliente?.nome || titulo?.cliente?.razao_social,
        has_codigo_barras: !!titulo?.codigo_barras,
        codigo_barras: titulo?.codigo_barras,
        codigo_barras_length: titulo?.codigo_barras?.length,
        has_charge_id: !!titulo?.charge_id,
        charge_id: titulo?.charge_id,
        valor: titulo?.valor,
        data_vencimento: titulo?.data_vencimento
      };
      
      logger.error(`Erro ao processar HTML do boleto - DETALHES COMPLETOS: ${JSON.stringify(detalhesErro, null, 2)}`);
      logger.error('Stack trace completo:', errorStack || 'Não disponível');
      
      const erroDescriptivo = new Error(
        `Erro ao processar HTML do boleto (ID: ${titulo?.id}): ${errorMessage}`
      );
      if (errorStack) {
        erroDescriptivo.stack = errorStack;
      }
      throw erroDescriptivo;
    }
  }

  /**
   * Gera PDF para um título (wrapper para compatibilidade)
   */
  static async generatePdfForTitulo(titulo: TituloComRelacoes): Promise<Buffer> {
    const pdfBase64 = await this.gerarPdfBase64(titulo);
    if (!pdfBase64) {
      throw new Error('Erro ao gerar PDF do boleto');
    }
    return Buffer.from(pdfBase64, 'base64');
  }

  /**
   * Gera PDF de múltiplos boletos (titulos já com cliente e banco).
   * Reutilizado por admin e SaaS.
   */
  static async gerarPdfDeMultiplosBoletos(titulos: TituloComRelacoes[]): Promise<Buffer> {
    const boletosHtml: string[] = [];
    for (const titulo of titulos) {
      const html = await this.processarBoletoHtml(titulo);
      if (html?.trim()) {
        boletosHtml.push(`<div style="page-break-after: always;">${html}</div>`);
      }
    }
    if (boletosHtml.length === 0) {
      throw new Error('Nenhum boleto válido para gerar PDF');
    }
    const template = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Boletos - ${boletosHtml.length} título(s)</title>
        <style>
          @media print { .page-break { page-break-after: always; } }
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        </style>
      </head>
      <body>
        ${boletosHtml.join('')}
      </body>
      </html>
    `;
    const templateLimpo = template.replace(/\{\{[^}]+\}\}/g, '');
    const htmlPdfModule = await import('html-pdf-node');
    const file = { content: templateLimpo };
    const options = { format: 'A4' as const, margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' }, printBackground: true, displayHeaderFooter: false };
    return new Promise<Buffer>((resolve, reject) => {
      htmlPdfModule.generatePdf(file, options, (err: Error | null, buffer: Buffer) => {
        if (err) reject(err);
        else resolve(buffer);
      });
    });
  }
}
