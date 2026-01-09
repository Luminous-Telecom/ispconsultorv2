import { Request, Response } from 'express';
import { ModeloRecibo } from '../../../models/documentos/ModeloRecibo';
import { ModeloReciboService } from '../../../services/documentos/ModeloReciboService';
import { ClienteService } from '../../../services/clientes/ClienteService';
import { Contrato } from '../../../models/contratos/Contrato';
import { ContratoService } from '../../../services/contratos/ContratoService';
import { Plano } from '../../../models/cadastros/Plano';
import { logger } from '../../../utils/logger';
import { VariaveisDocumentoService } from '../../../services/documentos/VariaveisDocumentoService';
import { PDFGenerationService } from '../../../services/pdf-generation/PDFGenerationService';
import { sendSuccess, sendError, sendNotFound } from '../../../utils/responseUtils';

export class ModeloReciboController {
  /**
   * Listar todos os recibos
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const result = await ModeloReciboService.list();

      sendSuccess(res, result, 'Recibos listados com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao listar recibos', 500, true);
    }
  }

  /**
   * Buscar recibo por ID
   */
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const recibo = await ModeloReciboService.getById(id);

      if (!recibo) {
        sendNotFound(res, 'Recibo não encontrado');
        return;
      }

      sendSuccess(res, recibo, 'Recibo encontrado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao buscar recibo', 500, true);
    }
  }

  /**
   * Criar novo recibo
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { nome, conteudo, descricao, ativo, tamanho_maximo, tipos_permitidos, retencao_dias, auto_backup, criptografia } = req.body;

      const recibo = await ModeloReciboService.create({
        nome,
        conteudo,
        descricao,
        ativo: ativo !== undefined ? ativo : true,
        tamanho_maximo: tamanho_maximo || 10485760,
        tipos_permitidos: tipos_permitidos || 'pdf,doc,docx,xls,xlsx',
        retencao_dias: retencao_dias || 365,
        auto_backup: auto_backup || false,
        criptografia: criptografia || false,
      });

      sendSuccess(res, recibo, 'Recibo criado com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar recibo', 500, true);
    }
  }

  /**
   * Atualizar recibo
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const recibo = await ModeloReciboService.getById(id);

      if (!recibo) {
        sendNotFound(res, 'Recibo não encontrado');
        return;
      }

      await ModeloReciboService.update(id, updateData);

      sendSuccess(res, recibo, 'Recibo atualizado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar recibo', 500, true);
    }
  }

  /**
   * Deletar recibo
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const recibo = await ModeloReciboService.getById(id);

      if (!recibo) {
        sendNotFound(res, 'Recibo não encontrado');
        return;
      }

      await ModeloReciboService.delete(id);

      sendSuccess(res, undefined, 'Recibo deletado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao deletar recibo', 500, true);
    }
  }

  /**
   * Gerar PDF do recibo usando html-pdf-node (Puppeteer)
   */
  static async generatePdf(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const recibo = await ModeloReciboService.getById(id);

      if (!recibo) {
        sendNotFound(res, 'Recibo não encontrado');
        return;
      }

      // Prepara o HTML completo com estilos básicos
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              color: #333;
              margin: 0;
              padding: 0;
              line-height: 1.2;
            }
            
            /* Estilos para imagens - preservar dimensões inline */
            img {
              display: block;
              page-break-inside: avoid;
              object-fit: contain;
              max-width: 100% !important;
            }
            
            /* Limitar imagens muito grandes (largura > 800px) */
            img[width] {
              max-width: 100% !important;
              height: auto !important;
            }
            
            /* Se tem style inline com dimensões, preservar proporções */
            img[style*="width"] {
              max-width: 100% !important;
              height: auto !important;
            }
            
            /* NÃO forçar auto se a imagem tem dimensões inline razoáveis */
            img:not([style*="width"]):not([style*="height"]):not([width]):not([height]) {
              max-width: 100%;
              height: auto;
            }
            
            /* Estilos para tabelas */
            figure.table {
              width: 100% !important;
              float: none !important;
              margin: 0 !important;
              margin-inline-start: 0 !important;
              margin-inline-end: 0 !important;
              margin-top: 0 !important;
              margin-bottom: 0.5em !important;
            }
            
            table {
              border-collapse: collapse;
              width: 100% !important;
              table-layout: auto !important;
              margin: 0 !important;
            }
            
            table colgroup,
            table colgroup col {
              width: auto !important;
            }
            
            table td, table th {
              border: none;
              width: auto !important;
              max-width: none !important;
              min-width: 0 !important;
              padding: 0 !important;
            }
            
            /* Remover espaçamento excessivo entre elementos */
            p {
              margin: 0 !important;
              padding: 0 !important;
              line-height: 1.2 !important;
            }
            
            /* Classes de espaçamento entre linhas */
            .line-height-1 { line-height: 1.0 !important; }
            .line-height-115 { line-height: 1.15 !important; }
            .line-height-12 { line-height: 1.2 !important; }
            .line-height-15 { line-height: 1.5 !important; }
            .line-height-2 { line-height: 2.0 !important; }
            
            p:empty {
              margin: 0 !important;
              padding: 0 !important;
              line-height: 0 !important;
              height: 0 !important;
              display: none !important;
            }
            
            br {
              display: block !important;
              margin: 0 !important;
              padding: 0 !important;
              line-height: 1 !important;
              height: 0.5em !important;
            }
            
            /* Adicionar pequeno espaço apenas entre parágrafos consecutivos */
            p + p {
              margin-top: 0.2em !important;
            }
            
            /* Espaçamento do body */
            body {
              line-height: 1.2 !important;
            }
            
            /* Espaçamento entre tabelas */
            figure.table + figure.table {
              margin-top: 0.5em !important;
            }
            
            /* Remover espaço entre parágrafos vazios e tabelas */
            p:empty + figure.table,
            figure.table + p:empty {
              margin: 0 !important;
            }
          </style>
        </head>
        <body>
          <div>${recibo.conteudo}</div>
        </body>
        </html>
      `;

      // Configurações do PDF
      const pdfBuffer = await PDFGenerationService.generateFromHtml(htmlContent, 'html-pdf-node', {
        format: 'A4',
        margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
        printBackground: true
      });

      // Configurar headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${recibo.nome}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      sendError(res, error, 'Erro ao gerar PDF', 500, true);
    }
  }

  /**
   * Gerar PDF de teste com dados de um cliente
   */
  static async generateTestPdf(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { cliente_id } = req.query;

      const recibo = await ModeloReciboService.getById(id);

      if (!recibo) {
        sendNotFound(res, 'Recibo não encontrado');
        return;
      }

      // Buscar cliente se fornecido
      let conteudoProcessado = recibo.conteudo;
      
      if (cliente_id) {
        const cliente = await ClienteService.getById(cliente_id as string);
        
        if (!cliente) {
          sendNotFound(res, 'Cliente não encontrado');
          return;
        }

        // Buscar contrato ativo do cliente
        const contrato = await ContratoService.findAtivoByCliente(cliente.id);

        // Processar variáveis do documento
        conteudoProcessado = await VariaveisDocumentoService.processarVariaveis(
          recibo.conteudo,
          {
            cliente,
            contrato: contrato || undefined
          }
        );
      }

      // Prepara o HTML completo com estilos básicos
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              color: #333;
              margin: 0;
              padding: 0;
              line-height: 1.2;
            }
            
            /* Estilos para imagens - preservar dimensões inline */
            img {
              display: block;
              page-break-inside: avoid;
              object-fit: contain;
              max-width: 100% !important;
            }
            
            /* Limitar imagens muito grandes (largura > 800px) */
            img[width] {
              max-width: 100% !important;
              height: auto !important;
            }
            
            /* Se tem style inline com dimensões, preservar proporções */
            img[style*="width"] {
              max-width: 100% !important;
              height: auto !important;
            }
            
            /* NÃO forçar auto se a imagem tem dimensões inline razoáveis */
            img:not([style*="width"]):not([style*="height"]):not([width]):not([height]) {
              max-width: 100%;
              height: auto;
            }
            
            /* Estilos para tabelas */
            figure.table {
              width: 100% !important;
              float: none !important;
              margin: 0 !important;
              margin-inline-start: 0 !important;
              margin-inline-end: 0 !important;
              margin-top: 0 !important;
              margin-bottom: 0.5em !important;
            }
            
            table {
              border-collapse: collapse;
              width: 100% !important;
              table-layout: auto !important;
              margin: 0 !important;
            }
            
            table colgroup,
            table colgroup col {
              width: auto !important;
            }
            
            table td, table th {
              border: none;
              width: auto !important;
              max-width: none !important;
              min-width: 0 !important;
              padding: 0 !important;
            }
            
            /* Remover espaçamento excessivo entre elementos */
            p {
              margin: 0 !important;
              padding: 0 !important;
              line-height: 1.2 !important;
            }
            
            /* Classes de espaçamento entre linhas */
            .line-height-1 { line-height: 1.0 !important; }
            .line-height-115 { line-height: 1.15 !important; }
            .line-height-12 { line-height: 1.2 !important; }
            .line-height-15 { line-height: 1.5 !important; }
            .line-height-2 { line-height: 2.0 !important; }
            
            p:empty {
              margin: 0 !important;
              padding: 0 !important;
              line-height: 0 !important;
              height: 0 !important;
              display: none !important;
            }
            
            br {
              display: block !important;
              margin: 0 !important;
              padding: 0 !important;
              line-height: 1 !important;
              height: 0.5em !important;
            }
            
            /* Adicionar pequeno espaço apenas entre parágrafos consecutivos */
            p + p {
              margin-top: 0.2em !important;
            }
            
            /* Espaçamento do body */
            body {
              line-height: 1.2 !important;
            }
            
            /* Espaçamento entre tabelas */
            figure.table + figure.table {
              margin-top: 0.5em !important;
            }
            
            /* Remover espaço entre parágrafos vazios e tabelas */
            p:empty + figure.table,
            figure.table + p:empty {
              margin: 0 !important;
            }
          </style>
        </head>
        <body>
          <div>${conteudoProcessado}</div>
        </body>
        </html>
      `;

      // Configurações do PDF
      const pdfBuffer = await PDFGenerationService.generateFromHtml(htmlContent, 'html-pdf-node', {
        format: 'A4',
        margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
        printBackground: true
      });

      // Configurar headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${recibo.nome}-teste.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      sendError(res, error, 'Erro ao gerar PDF de teste', 500, true);
    }
  }

  /**
   * Listar variáveis disponíveis para recibos
   */
  static async listarVariaveis(req: Request, res: Response): Promise<void> {
    try {
      const variaveis = VariaveisDocumentoService.getVariaveisDisponiveis();

      sendSuccess(res, variaveis, 'Variáveis listadas com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao listar variáveis', 500, true);
    }
  }
}
