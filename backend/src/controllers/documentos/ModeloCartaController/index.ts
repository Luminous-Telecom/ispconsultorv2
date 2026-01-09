import { Request, Response } from 'express';
import { ModeloCarta } from '../../../models/documentos/ModeloCarta';
import { ModeloCartaService } from '../../../services/documentos/ModeloCartaService';
import { ClienteService } from '../../../services/clientes/ClienteService';
import { ContratoService } from '../../../services/contratos/ContratoService';
import { Plano } from '../../../models/cadastros/Plano';
import { logger } from '../../../utils/logger';
import { VariaveisDocumentoService } from '../../../services/documentos/VariaveisDocumentoService';
import { PDFGenerationService } from '../../../services/pdf-generation/PDFGenerationService';
import { sendSuccess, sendError, sendNotFound } from '../../../utils/responseUtils';

export class ModeloCartaController {
  /**
   * Listar todas as cartas de cobrança
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const result = await ModeloCartaService.list();

      sendSuccess(res, result, 'Cartas de cobrança listadas com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao listar cartas de cobrança', 500, true);
    }
  }

  /**
   * Buscar carta de cobrança por ID
   */
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const carta = await ModeloCartaService.getById(id);

      if (!carta) {
        sendNotFound(res, 'Carta de cobrança não encontrada');
        return;
      }

      sendSuccess(res, carta, 'Carta de cobrança encontrada com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao buscar carta de cobrança', 500, true);
    }
  }

  /**
   * Criar nova carta de cobrança
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { nome, conteudo, descricao, ativo, tamanho_maximo, tipos_permitidos, retencao_dias, auto_backup, criptografia } = req.body;

      const carta = await ModeloCartaService.create({
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

      sendSuccess(res, carta, 'Carta de cobrança criada com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar carta de cobrança', 500, true);
    }
  }

  /**
   * Atualizar carta de cobrança
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const carta = await ModeloCartaService.getById(id);

      if (!carta) {
        sendNotFound(res, 'Carta de cobrança não encontrada');
        return;
      }

      await ModeloCartaService.update(id, updateData);

      sendSuccess(res, carta, 'Carta de cobrança atualizada com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar carta de cobrança', 500, true);
    }
  }

  /**
   * Deletar carta de cobrança
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const carta = await ModeloCartaService.getById(id);

      if (!carta) {
        sendNotFound(res, 'Carta de cobrança não encontrada');
        return;
      }

      await ModeloCartaService.delete(id);

      sendSuccess(res, undefined, 'Carta de cobrança deletada com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao deletar carta de cobrança', 500, true);
    }
  }

  /**
   * Gerar PDF da carta de cobrança usando html-pdf-node (Puppeteer)
   */
  static async generatePdf(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const carta = await ModeloCartaService.getById(id);

      if (!carta) {
        sendNotFound(res, 'Carta de cobrança não encontrada');
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
          <div>${carta.conteudo}</div>
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
      res.setHeader('Content-Disposition', `inline; filename="${carta.nome}.pdf"`);
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

      const carta = await ModeloCartaService.getById(id);

      if (!carta) {
        sendNotFound(res, 'Carta de cobrança não encontrada');
        return;
      }

      // Buscar cliente se fornecido
      let conteudoProcessado = carta.conteudo;
      
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
          carta.conteudo,
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
      res.setHeader('Content-Disposition', `inline; filename="${carta.nome}-teste.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      sendError(res, error, 'Erro ao gerar PDF de teste', 500, true, {
        context: 'ModeloCartaController',
        action: 'gerarPdfTeste'
      });
    }
  }

  /**
   * Listar variáveis disponíveis para cartas de cobrança
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
