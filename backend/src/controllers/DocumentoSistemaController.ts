import { Request, Response } from 'express';
import { DocumentoSistema } from '../models/DocumentoSistema';
import { logger } from '../utils/logger';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import { VariaveisDocumentoService } from '../services/VariaveisDocumentoService';

// @ts-ignore
import * as htmlPdf from 'html-pdf-node';

export class DocumentoSistemaController {
  /**
   * Listar todos os documentos do sistema
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { tipo } = req.query;
      
      const whereClause: any = {};
      if (tipo) {
        whereClause.tipo = tipo;
      }

      const documentos = await DocumentoSistema.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
      });

      res.json({
        success: true,
        data: documentos,
        message: 'Documentos do sistema listados com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao listar documentos do sistema:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar documento por ID
   */
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const documento = await DocumentoSistema.findByPk(id);

      if (!documento) {
        res.status(404).json({
          success: false,
          message: 'Documento não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: documento,
        message: 'Documento encontrado'
      });
    } catch (error) {
      logger.error('Erro ao buscar documento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar novo documento
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const documentoData = req.body;

      // Validar dados obrigatórios
      if (!documentoData.nome || !documentoData.tipo || !documentoData.conteudo) {
        res.status(400).json({
          success: false,
          message: 'Nome, tipo e conteúdo são obrigatórios'
        });
        return;
      }

      const documento = await DocumentoSistema.create(documentoData);

      res.status(201).json({
        success: true,
        data: documento,
        message: 'Documento criado com sucesso'
      });
    } catch (error: any) {
      logger.error('Erro ao criar documento:', error);
      
      if (error.name === 'SequelizeValidationError') {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors.map((err: any) => err.message)
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualizar documento
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const documentoData = req.body;

      const documento = await DocumentoSistema.findByPk(id);

      if (!documento) {
        res.status(404).json({
          success: false,
          message: 'Documento não encontrado'
        });
        return;
      }

      await documento.update(documentoData);

      res.json({
        success: true,
        data: documento,
        message: 'Documento atualizado com sucesso'
      });
    } catch (error: any) {
      logger.error('Erro ao atualizar documento:', error);
      
      if (error.name === 'SequelizeValidationError') {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors.map((err: any) => err.message)
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Deletar documento
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const documento = await DocumentoSistema.findByPk(id);

      if (!documento) {
        res.status(404).json({
          success: false,
          message: 'Documento não encontrado'
        });
        return;
      }

      await documento.destroy();

      res.json({
        success: true,
        message: 'Documento deletado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao deletar documento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar documentos por tipo
   */
  static async getByType(req: Request, res: Response): Promise<void> {
    try {
      const { tipo } = req.params;

      const documentos = await DocumentoSistema.findAll({
        where: { tipo, ativo: true },
        order: [['nome', 'ASC']],
      });

      res.json({
        success: true,
        data: documentos,
        message: `Documentos do tipo ${tipo} listados com sucesso`
      });
    } catch (error) {
      logger.error('Erro ao buscar documentos por tipo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar documento padrão por tipo
   */
  static async getDefaultByType(req: Request, res: Response): Promise<void> {
    try {
      const { tipo } = req.params;

      const documento = await DocumentoSistema.findOne({
        where: { tipo, ativo: true },
        order: [['created_at', 'ASC']], // Pega o primeiro criado como padrão
      });

      if (!documento) {
        res.status(404).json({
          success: false,
          message: `Nenhum documento padrão encontrado para o tipo ${tipo}`
        });
        return;
      }

      res.json({
        success: true,
        data: documento,
        message: 'Documento padrão encontrado'
      });
    } catch (error) {
      logger.error('Erro ao buscar documento padrão:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Listar tipos de documentos disponíveis
   */
  static async getTypes(req: Request, res: Response): Promise<void> {
    try {
      const tipos = await DocumentoSistema.findAll({
        attributes: ['tipo'],
        group: ['tipo'],
        where: { ativo: true },
        order: [['tipo', 'ASC']],
      });

      const tiposList = tipos.map(doc => doc.tipo);

      res.json({
        success: true,
        data: tiposList,
        message: 'Tipos de documentos listados com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao listar tipos de documentos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Converter arquivo Word para HTML
   */
  static async convertWordToHtml(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Nenhum arquivo foi enviado'
        });
        return;
      }

      const filePath = req.file.path;

      // Converter .docx para HTML usando mammoth
      const result = await mammoth.convertToHtml({ path: filePath });
      const html = result.value;

      // Deletar o arquivo temporário
      await fs.unlink(filePath);

      res.json({
        success: true,
        data: { html },
        message: 'Arquivo convertido com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao converter arquivo Word:', error);
      
      // Tentar deletar o arquivo em caso de erro
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          logger.error('Erro ao deletar arquivo temporário:', unlinkError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao converter arquivo'
      });
    }
  }

  /**
   * Gerar PDF do documento usando html-pdf-node (Puppeteer)
   */
  static async generatePdf(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const documento = await DocumentoSistema.findByPk(id);

      if (!documento) {
        res.status(404).json({
          success: false,
          message: 'Documento não encontrado'
        });
        return;
      }

      // Prepara o HTML completo sem CSS que interfira na formatação original
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
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
          ${documento.conteudo}
        </body>
        </html>
      `;

      // Configurações do PDF
      const options = {
        format: 'A4',
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        printBackground: true
      };

      const file = { content: htmlContent };
      const pdfBuffer = await htmlPdf.generatePdf(file, options);

      // Configurar headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${documento.nome}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Erro ao gerar PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar PDF'
      });
    }
  }

  /**
   * Listar variáveis disponíveis para documentos
   */
  static async listarVariaveis(req: Request, res: Response): Promise<void> {
    try {
      const variaveis = VariaveisDocumentoService.getVariaveisDisponiveis();

      res.json({
        success: true,
        data: variaveis,
        message: 'Variáveis listadas com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao listar variáveis:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}
