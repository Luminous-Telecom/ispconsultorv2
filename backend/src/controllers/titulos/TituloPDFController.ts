import { Request, Response } from 'express';
import { Titulo } from '../../models/Titulo';
import { Cliente } from '../../models/Cliente';
import { Plano } from '../../models/Plano';
import { Banco } from '../../models/Banco';
import { Op } from 'sequelize';
import { logger } from '../../utils/logger';
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import type htmlPdf from 'html-pdf-node';
import type { PdfOptions } from 'html-pdf-node';
import { DadosEmpresa } from '../../models/DadosEmpresa';
import { BarcodeService } from '../../services/BarcodeService';
import { BancoApiService } from '../../services/BancoApiService';
import { parseDateFromDb } from '../../utils/dateUtils';
import { TituloComRelacoes } from './types';
import { converterLogoParaBase64, getLogoBancoPadrao, processarInstrucao } from './TituloHelpers';

export class TituloPDFController {
  
  /**
   * Gera PDF em base64 para um título
   */
  public static async gerarPdfBase64(titulo: TituloComRelacoes): Promise<string | null> {
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
      
      // Converter Buffer para base64
      if (Buffer.isBuffer(pdfBuffer)) {
        return pdfBuffer.toString('base64');
      }
      // Se for Uint8Array, converter para Buffer primeiro
      return Buffer.from(pdfBuffer).toString('base64');
      
    } catch (error: unknown) {
      const errorMessage = (error as any)?.response?.data?.message || (error instanceof Error ? error.message : 'Erro desconhecido');
      logger.error('Erro ao gerar PDF do boleto:', errorMessage);
      return null;
    }
  }

  /**
   * Processa HTML do boleto substituindo variáveis do template
   */
  private static async processarBoletoHtml(titulo: TituloComRelacoes): Promise<string> {
    // Carregar dados da empresa
    const dadosEmpresa = await DadosEmpresa.findOne();
    if (!dadosEmpresa) {
      throw new Error('Dados da empresa não configurados');
    }

    // Preparar variáveis para o template
    // Usa toLocaleDateString para exibição, o que está correto (deve ser local)
    const dataVencimento = parseDateFromDb(titulo.data_vencimento)?.toLocaleDateString('pt-BR') || '';
    const dataProcessamento = new Date().toLocaleDateString('pt-BR');
    const valorBoleto = Number(titulo.valor).toFixed(2).replace('.', ',');
    
    // Carregar templates
    const templatesPath = path.join(__dirname, '../../templates');
    const topoTemplatePath = path.join(templatesPath, 'boleto-topo-inner.html');
    const corpoTemplatePath = path.join(templatesPath, 'boleto-corpo-inner.html');
    
    const topoTemplate = fs.readFileSync(topoTemplatePath, 'utf8');
    const corpoTemplate = fs.readFileSync(corpoTemplatePath, 'utf8');

    // Lógica simplificada de logo (mantida a original para não quebrar referências)
    let logoBanco = titulo.banco?.logo || getLogoBancoPadrao(titulo.banco?.tipo_banco || '') || dadosEmpresa.logo || '';
    logoBanco = converterLogoParaBase64(logoBanco);
    const logoEmpresa = converterLogoParaBase64(dadosEmpresa.logo || '');

    // Variáveis para substituição no template
    const templateVars = {
      // Dados da empresa (Beneficiário)
      LOGOMARCA: logoEmpresa,
      CEDENTE: dadosEmpresa.razao_social || dadosEmpresa.nome_fantasia || 'Empresa não configurada',
      EMPRESACPF: dadosEmpresa.cnpj || '',
      EMPRESAENDERECO: `${dadosEmpresa.endereco || ''} ${dadosEmpresa.numero || ''}`.trim(),
      EMPRESABAIRRO: dadosEmpresa.bairro || '',
      EMPRESACEP: dadosEmpresa.cep || '',
      EMPRESACIDADE: dadosEmpresa.cidade || '',
      EMPRESAESTADO: dadosEmpresa.estado || '',
      
      // Dados do banco
      LOGOBANCO: logoBanco,
      CODIGO_BANCO_COM_DV: titulo.banco?.codigo ? `${titulo.banco.codigo}-${BarcodeService.calcularDVCodigoBanco(titulo.banco.codigo)}` : '364-9',
      LINHA_DIGITAVEL: titulo.linha_digitavel || titulo.codigo_barras || '',
      AGENCIA_CODIGO: titulo.banco?.codigo || 'Não configurado',
      
      // Dados do boleto
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
      
      // Dados do cliente (Pagador)
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
      
      // Dados do plano
      NOME_PLANO: titulo.plano?.nome_plano || '',
      DESCRICAO_PLANO: titulo.plano?.descricao || '',
      TIPO_SERVICO: titulo.plano?.tipo_servico || 'Internet',
      QUANTIDADE_USUARIOS: titulo.plano?.quantidade_usuarios || '1',
      VALOR_PLANO: valorBoleto,
      PERIODICIDADE: 'Mensal',
      
      // Instruções
      TEXTO_MULTAMORA: titulo.banco?.percentual_multa || titulo.banco?.percentual_juros ? 
        `Multa de ${titulo.banco?.percentual_multa || 2}% + Juros de ${titulo.banco?.percentual_juros || 0.033}% ao dia após o vencimento` : '',
      INSTRUCOES1: processarInstrucao(titulo.banco?.instrucao_linha_1 || '', titulo),
      INSTRUCOES2: processarInstrucao(titulo.banco?.instrucao_linha_2 || '', titulo),
      INSTRUCOES3: processarInstrucao(titulo.banco?.instrucao_linha_3 || '', titulo),
      INSTRUCOES4: processarInstrucao(titulo.banco?.instrucao_linha_4 || '', titulo),
      INSTRUCOES5: processarInstrucao(titulo.banco?.instrucao_linha_5 || '', titulo),
      
      // QR Code PIX e Código de Barras
      QRCODE: titulo.qrcode_image || '',
      QRCODE_HTML: titulo.qrcode_image
        ? `<img src="${titulo.qrcode_image}" style="width: 100px; height: 100px; max-width: 100px; max-height: 100px;" /><br><span style="font-size: 8px; font-weight: bold;">PIX - Pagamento Instantâneo</span>`
        : '<div style="color: #666; font-size: 8px;">QR Code PIX<br>Não disponível</div>',
      BOLETO_BARCODE2: titulo.codigo_barras ? BarcodeService.generateFebrabanBarcodeSvg(titulo.codigo_barras) : ''
    };

    // Processar templates
    let topoProcessado = topoTemplate;
    let corpoProcessado = corpoTemplate;
    
    Object.entries(templateVars).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      topoProcessado = topoProcessado.replace(regex, String(value));
      corpoProcessado = corpoProcessado.replace(regex, String(value));
    });

    return `${topoProcessado}${corpoProcessado}`;
  }

  /**
   * Imprime boleto único (retorna HTML)
   */
  public static async imprimirBoleto(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await Titulo.findByPk(id, {
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Plano, as: 'plano' },
          { model: Banco, as: 'banco', attributes: ['id', 'nome', 'codigo', 'tipo_banco', 'client_id_producao', 'client_secret_producao', 'sandbox', 'api_key', 'url_retorno', 'percentual_multa', 'percentual_juros', 'instrucao_linha_1', 'instrucao_linha_2', 'instrucao_linha_3', 'instrucao_linha_4', 'instrucao_linha_5', 'logo'] }
        ]
      }) as TituloComRelacoes | null;

      if (!titulo) {
        res.status(404).json({ success: false, message: 'Título não encontrado' });
        return;
      }

      // Registrar no banco se não tiver charge_id
      if (!titulo.charge_id) {
        logger.info('Registrando título no banco antes de imprimir...', { titulo_id: titulo.id });

        const resultado = await BancoApiService.gerarTitulo(titulo as TituloComRelacoes);
        
        if (!resultado.success || !resultado.data) {
          logger.error('Falha ao registrar título no banco', { titulo_id: titulo.id, message: resultado.message });
          res.status(500).json({ success: false, message: 'Não foi possível registrar o título no banco: ' + (resultado.message || 'Erro desconhecido'), error: 'ERRO_REGISTRO_BANCO' });
          return;
        }

        const codigoBarrasFinal = typeof resultado.data.codigo_barras === 'string' ? resultado.data.codigo_barras : null;
        const codigoBarrasParaSalvar = codigoBarrasFinal !== null ? codigoBarrasFinal : null;

        await titulo.update({
          charge_id: resultado.data.charge_id,
          url_boleto: resultado.data.url_boleto as string | null,
          qrcode: resultado.data.qrcode as string | null,
          qrcode_image: resultado.data.qrcode_image as string | null,
          codigo_barras: codigoBarrasParaSalvar,
          linha_digitavel: resultado.data.linha_digitavel as string | null,
          nosso_numero: resultado.data.nosso_numero as string | null
        });
        await titulo.reload();
      }

      // Processar HTML
      const template = await this.processarBoletoHtml(titulo);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Boleto - ${titulo.numero_titulo}</title>
          <style> body { margin: 0; padding: 0; } </style>
        </head>
        <body>
          ${template}
        </body>
        </html>
      `);
    } catch (error: unknown) {
      logger.error('Erro ao imprimir boleto', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  /**
   * Imprime múltiplos boletos (retorna HTML)
   */
  public static async imprimirBoletosMultiplos(req: Request, res: Response): Promise<void> {
    try {
      let ids = req.body.ids || req.query.ids;
      
      if (typeof ids === 'string') {
        try {
          ids = JSON.parse(ids);
        } catch {
          ids = ids.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
        }
      }
      if (typeof ids === 'number') ids = [ids];

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ success: false, message: 'IDs dos títulos não fornecidos' });
        return;
      }

      const titulos = await Titulo.findAll({ where: { id: ids }, include: [{ model: Cliente, as: 'cliente' }, { model: Plano, as: 'plano' }, { model: Banco, as: 'banco' }] });
      if (titulos.length === 0) {
        res.status(404).json({ success: false, message: 'Nenhum título encontrado' });
        return;
      }

      const boletosHtml: string[] = [];

      for (const titulo of titulos) {
        if (!titulo.charge_id) {
          try {
            const resultado = await BancoApiService.gerarTitulo(titulo as TituloComRelacoes);
            
            if (resultado.success && resultado.data) {
              const codigoBarrasParaSalvar = typeof resultado.data.codigo_barras === 'string' ? resultado.data.codigo_barras : null;
              await titulo.update({ charge_id: resultado.data.charge_id, codigo_barras: codigoBarrasParaSalvar, linha_digitavel: resultado.data.linha_digitavel as string | null });
              await titulo.reload();
              logger.info('Título registrado com sucesso', { titulo_id: titulo.id });
            } else {
              logger.error('Falha ao registrar título', { titulo_id: titulo.id, message: resultado.message });
            }
          } catch (error: unknown) {
            logger.error('Erro ao registrar título', { error, titulo_id: titulo.id });
          }
        }

        const boletoHtml = await this.processarBoletoHtml(titulo);
        boletosHtml.push(`<div style="page-break-after: always;">${boletoHtml}</div>`);
      }

      const autoPrint = req.query.print === 'true';
      const template = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Boletos - ${titulos.length} título(s)</title>
          <style>
            @media print { .page-break { page-break-after: always; } }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            .boleto { margin-bottom: 0; }
          </style>
          ${autoPrint ? '<script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>' : ''}
        </head>
        <body>
          ${boletosHtml.join('\n')}
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(template);
    } catch (error: unknown) {
      logger.error('Erro ao imprimir boletos múltiplos', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  /**
   * Gera PDF de múltiplos boletos
   */
  public static async gerarPdfBoletosMultiplos(req: Request, res: Response): Promise<void> {
    try {
      let ids: number[] = [];
      const idsParam = req.query.ids as string;
      
      if (idsParam) {
        try {
          const parsed = JSON.parse(idsParam);
          ids = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          ids = idsParam.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
        }
      }

      if (!ids || ids.length === 0) {
        res.status(400).json({ success: false, message: 'IDs dos títulos não fornecidos' });
        return;
      }

      const titulos = await Titulo.findAll({ where: { id: { [Op.in]: ids } }, include: [{ model: Cliente, as: 'cliente' }, { model: Plano, as: 'plano' }, { model: Banco, as: 'banco' }] });
      if (titulos.length === 0) {
        res.status(404).json({ success: false, message: 'Nenhum título encontrado' });
        return;
      }

      const boletosHtml: string[] = [];

      for (const titulo of titulos) {
        if (!titulo.charge_id) {
          try {
            const resultado = await BancoApiService.gerarTitulo(titulo as TituloComRelacoes);
            
            if (resultado.success && resultado.data) {
              const codigoBarrasParaSalvar = typeof resultado.data.codigo_barras === 'string' ? resultado.data.codigo_barras : null;
              await titulo.update({ charge_id: resultado.data.charge_id, codigo_barras: codigoBarrasParaSalvar, linha_digitavel: resultado.data.linha_digitavel as string | null });
              await titulo.reload();
            }
          } catch (error: unknown) {
            logger.error('Erro ao registrar título no banco', { titulo_id: titulo.id, error });
          }
        }
        
        const boletoHtml = await this.processarBoletoHtml(titulo);
        boletosHtml.push(`<div style="page-break-after: always;">${boletoHtml}</div>`);
      }

      const template = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Boletos - ${titulos.length} título(s)</title>
          <style>
            @media print { .page-break { page-break-after: always; } }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            .boleto { margin-bottom: 0; }
          </style>
        </head>
        <body>
          ${boletosHtml.join('')}
        </body>
        </html>
      `;

      // Limpar variáveis não processadas
      const templateLimpo = template.replace(/\{\{[^}]+\}\}/g, '');

      // Converter HTML para PDF usando html-pdf-node
      const htmlPdfModule = await import('html-pdf-node') as typeof htmlPdf;
      const file = { content: templateLimpo };
      const options: PdfOptions = { format: 'A4', margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }, printBackground: true, displayHeaderFooter: false };
      
      const pdfBuffer = await htmlPdfModule.generatePdf(file, options);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="boletos-${titulos.length}-titulos.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error: unknown) {
      logger.error('Erro ao gerar PDF de múltiplos boletos', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }
}

