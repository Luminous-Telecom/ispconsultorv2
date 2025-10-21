import { Request, Response } from 'express';
import { DocumentoSistema } from '../models/DocumentoSistema';
import { logger } from '../utils/logger';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import PDFDocument from 'pdfkit';

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
   * Gerar PDF do documento
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

      // Criar documento PDF
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });

      // Configurar headers para exibir inline no navegador
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${documento.nome}.pdf"`);

      // Pipe do PDF para a resposta
      doc.pipe(res);

      // Processar HTML do CKEditor preservando formatação
      const htmlContent = documento.conteudo
        // Converte entidades HTML
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      // Log do HTML original
      logger.info('=== INÍCIO DO PROCESSAMENTO PDF ===');
      logger.info(`Documento: ${documento.nome}`);
      logger.info(`Tamanho do HTML: ${htmlContent.length} caracteres`);
      
      // Log de amostra do HTML para debug
      const firstParagraphs = htmlContent.match(/<p[^>]*>.*?<\/p>/gi);
      if (firstParagraphs && firstParagraphs.length > 0) {
        logger.info(`Exemplo de parágrafo HTML: ${firstParagraphs[0].substring(0, 200)}`);
      }

      // Função para extrair texto e formatação de HTML preservando a ordem e estrutura
      const processHtmlBlock = (html: string) => {
        const blocks: Array<{ 
          text: string; 
          bold?: boolean; 
          italic?: boolean; 
          underline?: boolean; 
          heading?: number; 
          listItem?: boolean; 
          indent?: number; 
          align?: 'left' | 'center' | 'right' | 'justify';
          fontSize?: number;
          isEmpty?: boolean;
        }> = [];
        
        // Remove comentários HTML
        html = html.replace(/<!--[\s\S]*?-->/g, '');
        
        // Função auxiliar para extrair alinhamento (inline style ou classes)
        const extractAlign = (tag: string): 'left' | 'center' | 'right' | 'justify' => {
          // Tenta inline style primeiro
          if (/text-align:\s*center/i.test(tag)) return 'center';
          if (/text-align:\s*right/i.test(tag)) return 'right';
          if (/text-align:\s*justify/i.test(tag)) return 'justify';
          
          // Tenta classes do CKEditor
          if (/class="[^"]*text-center[^"]*"/i.test(tag) || /class="[^"]*ck-align-center[^"]*"/i.test(tag)) return 'center';
          if (/class="[^"]*text-right[^"]*"/i.test(tag) || /class="[^"]*ck-align-right[^"]*"/i.test(tag)) return 'right';
          if (/class="[^"]*text-justify[^"]*"/i.test(tag) || /class="[^"]*ck-align-justify[^"]*"/i.test(tag)) return 'justify';
          
          return 'left';
        };
        
        // Função auxiliar para extrair tamanho de fonte
        const extractFontSize = (tag: string): number | undefined => {
          const match = tag.match(/font-size:\s*(\d+)px/);
          return match ? parseInt(match[1]) : undefined;
        };
        
        // Função auxiliar para processar conteúdo interno (negrito, itálico, etc)
        const processInlineFormatting = (content: string): { text: string; bold: boolean; italic: boolean; underline: boolean } => {
          const text = content.replace(/<[^>]*>/g, '').trim();
          return {
            text,
            bold: /<strong>|<b>/.test(content),
            italic: /<em>|<i>/.test(content),
            underline: /<u>/.test(content)
          };
        };
        
        // Processa o HTML sequencialmente para manter a ordem
        // Regex para capturar todos os elementos na ordem (incluindo divs)
        const elementRegex = /<(h[1-6]|p|ul|ol|div)([^>]*)>(.*?)<\/\1>/gis;
        let match;
        
        while ((match = elementRegex.exec(html)) !== null) {
          const tagName = match[1].toLowerCase();
          const attrs = match[2];
          const content = match[3];
          const fullTag = match[0];
          
          if (tagName.startsWith('h')) {
            // Heading
            const level = parseInt(tagName.charAt(1));
            const align = extractAlign(fullTag);
            const formatted = processInlineFormatting(content);
            
            if (formatted.text) {
              blocks.push({
                text: formatted.text,
                heading: level,
                bold: true,
                italic: formatted.italic,
                underline: formatted.underline,
                align
              });
            }
          } else if (tagName === 'p') {
            // Parágrafo
            const align = extractAlign(fullTag);
            const fontSize = extractFontSize(fullTag);
            
            // Se o parágrafo está vazio ou só tem &nbsp;, adiciona espaço
            if (!content.trim() || content.trim() === '&nbsp;') {
              blocks.push({
                text: '',
                isEmpty: true,
                align
              });
            } else {
              // Processa <br> como quebras de linha dentro do parágrafo
              const lines = content.split(/<br\s*\/?>/gi);
              
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const formatted = processInlineFormatting(line);
                if (formatted.text) {
                  blocks.push({
                    text: formatted.text,
                    bold: formatted.bold,
                    italic: formatted.italic,
                    underline: formatted.underline,
                    align,
                    fontSize
                  });
                } else if (i < lines.length - 1) {
                  // Linha vazia entre <br> tags
                  blocks.push({
                    text: '',
                    isEmpty: true,
                    align
                  });
                }
              }
            }
          } else if (tagName === 'ul') {
            // Lista não ordenada
            const liRegex = /<li[^>]*>(.*?)<\/li>/gi;
            let liMatch;
            while ((liMatch = liRegex.exec(content)) !== null) {
              const formatted = processInlineFormatting(liMatch[1]);
              if (formatted.text) {
                blocks.push({
                  text: formatted.text,
                  listItem: true,
                  bold: formatted.bold,
                  italic: formatted.italic,
                  underline: formatted.underline
                });
              }
            }
          } else if (tagName === 'ol') {
            // Lista ordenada
            const liRegex = /<li[^>]*>(.*?)<\/li>/gi;
            let liMatch;
            let orderCounter = 1;
            while ((liMatch = liRegex.exec(content)) !== null) {
              const formatted = processInlineFormatting(liMatch[1]);
              if (formatted.text) {
                blocks.push({
                  text: `${orderCounter}. ${formatted.text}`,
                  listItem: true,
                  bold: formatted.bold,
                  italic: formatted.italic,
                  underline: formatted.underline
                });
                orderCounter++;
              }
            }
          } else if (tagName === 'div') {
            // Div - trata como parágrafo
            const align = extractAlign(fullTag);
            const fontSize = extractFontSize(fullTag);
            
            // Se o div está vazio ou só tem &nbsp;, adiciona espaço
            if (!content.trim() || content.trim() === '&nbsp;') {
              blocks.push({
                text: '',
                isEmpty: true,
                align
              });
            } else {
              // Processa <br> como quebras de linha dentro do div
              const lines = content.split(/<br\s*\/?>/gi);
              
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const formatted = processInlineFormatting(line);
                if (formatted.text) {
                  blocks.push({
                    text: formatted.text,
                    bold: formatted.bold,
                    italic: formatted.italic,
                    underline: formatted.underline,
                    align,
                    fontSize
                  });
                } else if (i < lines.length - 1) {
                  // Linha vazia entre <br> tags
                  blocks.push({
                    text: '',
                    isEmpty: true,
                    align
                  });
                }
              }
            }
          }
        }
        
        // Se não encontrou nenhum bloco estruturado, processa como texto simples
        if (blocks.length === 0) {
          const simpleText = html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<p[^>]*>/gi, '')
            .replace(/<\/div>/gi, '\n')
            .replace(/<div[^>]*>/gi, '')
            .replace(/<[^>]*>/g, '')
            .trim();
          
          if (simpleText) {
            const lines = simpleText.split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed) {
                blocks.push({ 
                  text: trimmed,
                  align: 'left'
                });
              } else {
                blocks.push({
                  text: '',
                  isEmpty: true,
                  align: 'left'
                });
              }
            }
          }
        }
        
        return blocks;
      };

      const blocks = processHtmlBlock(htmlContent);
      
      // Log dos blocos processados
      logger.info(`Total de blocos processados: ${blocks.length}`);
      blocks.forEach((block, index) => {
        logger.info(`Bloco ${index + 1}: ${JSON.stringify({
          text: block.text.substring(0, 50) + (block.text.length > 50 ? '...' : ''),
          heading: block.heading,
          bold: block.bold,
          italic: block.italic,
          align: block.align,
          fontSize: block.fontSize,
          listItem: block.listItem,
          isEmpty: block.isEmpty
        })}`);
      });
      
      doc.fontSize(10).font('Helvetica');

      for (const block of blocks) {
        // Verifica se precisa de nova página
        if (doc.y > 750) {
          doc.addPage();
        }

        // Se é um parágrafo vazio, adiciona espaço
        if (block.isEmpty) {
          doc.moveDown(0.5);
          continue;
        }

        // Define fonte baseado na formatação
        let font = 'Helvetica';
        if (block.bold && block.italic) {
          font = 'Helvetica-BoldOblique';
        } else if (block.bold) {
          font = 'Helvetica-Bold';
        } else if (block.italic) {
          font = 'Helvetica-Oblique';
        }

        // Define fonte e tamanho baseado no tipo de bloco
        if (block.heading) {
          const headingSizes = { 1: 18, 2: 16, 3: 14, 4: 12, 5: 11, 6: 10 };
          const size = headingSizes[block.heading as keyof typeof headingSizes] || 12;
          doc.moveDown(0.5);
          doc.fontSize(size)
             .font('Helvetica-Bold')
             .text(block.text, { align: block.align || 'left' });
          doc.fontSize(10).font('Helvetica');
          doc.moveDown(0.5);
        } else if (block.listItem) {
          // Listas com formatação
          const listPrefix = block.text.match(/^\d+\./) ? '' : '• ';
          const listText = listPrefix + (listPrefix ? block.text : block.text);
          
          doc.font(font)
             .fontSize(block.fontSize || 10)
             .text(listText, { 
               indent: 20,
               align: block.align || 'left'
             });
          doc.moveDown(0.2);
        } else {
          // Texto normal com formatação
          const size = block.fontSize || 10;
          
          doc.font(font)
             .fontSize(size)
             .text(block.text, { 
               align: block.align || 'left',
               continued: false
             });
          doc.moveDown(0.5);
        }
      }

      // Finalizar o PDF
      doc.end();

      logger.info(`=== PDF FINALIZADO ===`);
      logger.info(`PDF gerado para documento: ${documento.nome}`);
    } catch (error) {
      logger.error('Erro ao gerar PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar PDF'
      });
    }
  }
}
