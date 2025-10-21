import { Request, Response } from 'express';
import { DocumentoSistema } from '../models/DocumentoSistema';
import { logger } from '../utils/logger';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import PDFDocument from 'pdfkit';
import 'pdfkit-table';

export class DocumentoSistemaController {
  /**
   * Sanitiza o conteúdo HTML removendo apenas tags problemáticas
   */
  private static sanitizeHtmlContent(html: string): string {
    let sanitized = html;
    
    // Remove apenas spans vazios ou genéricos, mas preserva spans com font-family
    sanitized = sanitized.replace(/<span\s*>(.*?)<\/span>/gi, '$1');
    
    return sanitized;
  }

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

      // TEMPORÁRIO: Não sanitizar para testar se a fonte está sendo salva
      // if (documentoData.conteudo) {
      //   documentoData.conteudo = DocumentoSistemaController.sanitizeHtmlContent(documentoData.conteudo);
      // }

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

      // Sanitiza apenas spans vazios, preservando fontes
      if (documentoData.conteudo) {
        documentoData.conteudo = DocumentoSistemaController.sanitizeHtmlContent(documentoData.conteudo);
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
      let htmlContent = documento.conteudo
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // Corrige tags malformadas
        .replace(/([^<])(span\s+style="[^"]*">)/gi, '$1<$2')
        .replace(/(<\/span)([^>])/gi, '$1>$2')
        // Remove spans vazios
        .replace(/<span\s*>(.*?)<\/span>/gi, '$1');
      
      // Função auxiliar para limpar texto de tags HTML
      const cleanHtmlText = (text: string): string => {
        return text
          .replace(/span\s+style="[^"]*">/gi, ' ')
          .replace(/\/span>/gi, ' ')
          .replace(/<\/?span[^>]*>/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };
      
      // Função para mapear nome de fonte para PDFKit
      const mapFontToPdfKit = (fontName: string): string => {
        const normalized = fontName.replace(/['"]/g, '').toLowerCase().trim();
        
        if (normalized.includes('courier')) return 'Courier';
        if (normalized.includes('times') || normalized.includes('georgia')) return 'Times-Roman';
        
        return 'Helvetica'; // Padrão
      };

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
          fontFamily?: string;
          isEmpty?: boolean;
          isTable?: boolean;
          tableData?: {
            headers: Array<{ text: string; fontSize?: number; align?: 'left' | 'center' | 'right' | 'justify' }>;
            rows: Array<Array<{ text: string; fontSize?: number; align?: 'left' | 'center' | 'right' | 'justify' }>>;
          };
          position?: number;
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
        
        // Função auxiliar para extrair família de fonte
        const extractFontFamily = (tag: string): string | undefined => {
          const match = tag.match(/font-family:\s*['"]*([^;'"]+)['"]*[;"]*/i);
          return match ? match[1].split(',')[0].trim().replace(/['"]/g, '') : undefined;
        };
        
        // Função auxiliar para processar conteúdo interno
        const processInlineFormatting = (content: string): { text: string; bold: boolean; italic: boolean; underline: boolean; fontFamily?: string } => {
          // Extrai fontFamily
          const spanMatch = content.match(/<span[^>]*style="[^"]*font-family:\s*([^;"']+)[^"]*"[^>]*>/i);
          const fontFamily = spanMatch ? spanMatch[1].split(',')[0].trim().replace(/['"]/g, '') : undefined;
          
          // Remove tags preservando espaços
          let text = content
            .replace(/<\/[^>]+>/g, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/span\s+style="[^"]*">/gi, ' ')
            .replace(/\/span>/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (!text) {
            return { text: '', bold: false, italic: false, underline: false, fontFamily };
          }
          
          // Verifica formatação
          const bold = /<(strong|b)(\s[^>]*)?>/i.test(content);
          const italic = /<(em|i)(\s[^>]*)?>/i.test(content);
          const underline = /<u(\s[^>]*)?>/i.test(content);
          
          return { text, bold, italic, underline, fontFamily };
        };
        
        // Primeiro processa tabelas separadamente (pois podem ter conteúdo complexo)
        const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
        let tableMatch;
        const tablePositions: Array<{ start: number; end: number; content: string }> = [];
        
        while ((tableMatch = tableRegex.exec(html)) !== null) {
          tablePositions.push({
            start: tableMatch.index,
            end: tableMatch.index + tableMatch[0].length,
            content: tableMatch[0]
          });
        }
        
        // Processa o HTML sequencialmente para manter a ordem
        // Regex para capturar todos os elementos na ordem (incluindo divs)
        const elementRegex = /<(h[1-6]|p|ul|ol|div)([^>]*)>(.*?)<\/\1>/gis;
        let match;
        
        while ((match = elementRegex.exec(html)) !== null) {
          // Verifica se esta posição está dentro de uma tabela
          const matchPos = match.index;
          const isInsideTable = tablePositions.some(t => matchPos >= t.start && matchPos < t.end);
          if (isInsideTable) continue; // Pula elementos dentro de tabelas
          
          const tagName = match[1].toLowerCase();
          const attrs = match[2];
          const content = match[3];
          const fullTag = match[0];
          const position = matchPos; // Guarda posição para ordenar depois
          
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
                align,
                position
              });
            }
          } else if (tagName === 'p') {
            // Parágrafo
            const align = extractAlign(fullTag);
            const fontSize = extractFontSize(fullTag);
            const fontFamily = extractFontFamily(fullTag);
            
            // Se o parágrafo está vazio ou só tem &nbsp;, adiciona espaço
            if (!content.trim() || content.trim() === '&nbsp;') {
              blocks.push({
                text: '',
                isEmpty: true,
                align,
                position
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
                    fontSize,
                    fontFamily: fontFamily || formatted.fontFamily,
                    position
                  });
                } else if (i < lines.length - 1) {
                  // Linha vazia entre <br> tags
                  blocks.push({
                    text: '',
                    isEmpty: true,
                    align,
                    position
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
                  underline: formatted.underline,
                  position
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
                  underline: formatted.underline,
                  position
                });
                orderCounter++;
              }
            }
          } else if (tagName === 'div') {
            // Div - trata como parágrafo
            const align = extractAlign(fullTag);
            const fontSize = extractFontSize(fullTag);
            const fontFamily = extractFontFamily(fullTag);
            
            // Se o div está vazio ou só tem &nbsp;, adiciona espaço
            if (!content.trim() || content.trim() === '&nbsp;') {
              blocks.push({
                text: '',
                isEmpty: true,
                align,
                position
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
                    fontSize,
                    fontFamily: fontFamily || formatted.fontFamily,
                    position
                  });
                } else if (i < lines.length - 1) {
                  // Linha vazia entre <br> tags
                  blocks.push({
                    text: '',
                    isEmpty: true,
                    align,
                    position
                  });
                }
              }
            }
          }
        }
        
        // Processa tabelas encontradas e insere nos blocos na ordem correta
        for (const tablePos of tablePositions) {
          const tableHtml = tablePos.content;
          
          const headers: Array<{ text: string; fontSize?: number; align?: 'left' | 'center' | 'right' | 'justify' }> = [];
          const rows: Array<Array<{ text: string; fontSize?: number; align?: 'left' | 'center' | 'right' | 'justify' }>> = [];
          let isFirstRow = true;
          
          // Extrai linhas da tabela
          const trRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
          let trMatch;
          
          while ((trMatch = trRegex.exec(tableHtml)) !== null) {
            const rowContent = trMatch[1];
            
            // Verifica se é header (th) ou células normais (td)
            const hasHeaders = /<th[^>]*>/i.test(rowContent);
            
            // Extrai células da linha
            const cellRegex = /<(td|th)([^>]*)>(.*?)<\/\1>/gis;
            let cellMatch;
            const cells: Array<{ text: string; fontSize?: number; align?: 'left' | 'center' | 'right' | 'justify' }> = [];
            
            while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
              const cellTag = cellMatch[0];
              let cellContent = cellMatch[3];
              const fontSize = extractFontSize(cellTag);
              const align = extractAlign(cellTag);
              
              // Preserva quebras de linha convertendo <p>, <br> em \n
              let cellText = cellContent
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
                .replace(/<p[^>]*>/gi, '')
                .replace(/<\/p>/gi, '\n')
                .replace(/&nbsp;/g, ' ')
                .replace(/<[^>]*>/g, '') // Remove todas as outras tags
                .trim();
              
              cells.push({
                text: cellText,
                fontSize,
                align
              });
            }
            
            // Se tem th ou é a primeira linha, trata como header
            if ((hasHeaders || isFirstRow) && headers.length === 0) {
              headers.push(...cells);
              isFirstRow = false;
            } else {
              if (cells.length > 0) {
                rows.push(cells);
              }
            }
          }
          
          // Adiciona tabela completa como bloco
          if (headers.length > 0 || rows.length > 0) {
            blocks.push({
              text: '', // Não usado para tabelas
              isTable: true,
              tableData: {
                headers: headers.length > 0 ? headers : (rows.length > 0 ? rows.shift()! : []),
                rows
              },
              align: 'left' as const,
              position: tablePos.start // Guarda posição para ordenar depois
            });
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
        
        // Ordena blocos por posição no HTML original (se tiverem posição definida)
        blocks.sort((a, b) => {
          if (a.position !== undefined && b.position !== undefined) {
            return a.position - b.position;
          }
          return 0; // Mantém ordem original se não tiver posição
        });
        
        return blocks;
      };

      const blocks = processHtmlBlock(htmlContent);
      
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

        // Define fonte base a partir do fontFamily ou usa Helvetica como padrão
        let baseFont = 'Helvetica';
        if (block.fontFamily) {
          baseFont = mapFontToPdfKit(block.fontFamily);
        }
        
        // Define fonte baseado na formatação
        let font = baseFont;
        if (block.bold && block.italic) {
          font = `${baseFont}-BoldOblique`;
          // Fallback para fontes que não têm todas as variantes
          if (!['Helvetica', 'Times-Roman', 'Courier'].includes(baseFont)) {
            font = baseFont;
          }
        } else if (block.bold) {
          font = `${baseFont}-Bold`;
          if (!['Helvetica', 'Times-Roman', 'Courier'].includes(baseFont)) {
            font = baseFont;
          }
        } else if (block.italic) {
          font = `${baseFont}-Oblique`;
          if (baseFont === 'Times-Roman') {
            font = 'Times-Italic';
          } else if (baseFont === 'Courier') {
            font = 'Courier-Oblique';
          } else if (!['Helvetica'].includes(baseFont)) {
            font = baseFont;
          }
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
        } else if (block.isTable && block.tableData) {
          // Renderiza tabela com células lado a lado
          const { headers, rows } = block.tableData;
          
          doc.moveDown(0.5);
          
          // Calcula largura das colunas
          const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
          const numCols = Math.max(headers.length, ...rows.map(r => r.length));
          const colWidth = pageWidth / numCols;
          
          // Renderiza headers
          if (headers.length > 0) {
            const startY = doc.y;
            let maxHeight = 0;
            
            headers.forEach((header, colIndex) => {
              if (header.text && header.text.trim()) {
                const x = doc.page.margins.left + (colIndex * colWidth);
                const fontSize = header.fontSize || 10;
                const align = header.align || 'left';
                
                doc.font('Helvetica-Bold')
                   .fontSize(fontSize)
                   .text(header.text.trim(), x, startY, {
                     width: colWidth - 10,
                     align: align,
                     lineBreak: true
                   });
                
                const cellHeight = doc.y - startY;
                if (cellHeight > maxHeight) maxHeight = cellHeight;
                
                // Restaura Y para não afetar próximo header
                doc.y = startY;
              }
            });
            
            // Move Y para depois do header mais alto
            doc.y = startY + maxHeight;
            doc.moveDown(0.5);
          }
          
          // Renderiza linhas
          rows.forEach((row) => {
            const startY = doc.y;
            let maxHeight = 0;
            
            row.forEach((cell, colIndex) => {
              if (cell.text && cell.text.trim()) {
                const x = doc.page.margins.left + (colIndex * colWidth);
                const fontSize = cell.fontSize || 10;
                const align = cell.align || 'left';
                
                // Processa quebras de linha dentro da célula
                const cellLines = cell.text.split('\n').filter(line => line.trim());
                const cellText = cellLines.join('\n');
                
                // Salva posição Y atual antes de escrever
                const currentY = doc.y;
                
                doc.font('Helvetica')
                   .fontSize(fontSize)
                   .text(cellText, x, startY, {
                     width: colWidth - 10,
                     align: align,
                     lineBreak: true
                   });
                
                const cellHeight = doc.y - startY;
                if (cellHeight > maxHeight) maxHeight = cellHeight;
                
                // Restaura Y para não afetar próxima célula da mesma linha
                doc.y = startY;
              }
            });
            
            // Move Y para depois da linha mais alta
            doc.y = startY + maxHeight;
            doc.moveDown(0.3);
          });
          
          // Garante que voltamos para margem esquerda e move um pouco para baixo
          doc.x = doc.page.margins.left;
          doc.moveDown(0.5);
        } else {
          // Texto normal - processa formatação inline (strong, em, etc)
          const size = block.fontSize || 10;
          doc.fontSize(size);
          
          // Tenta encontrar o HTML original deste bloco para processar tags inline
          const renderWithInlineFormatting = () => {
            // Procura divs no HTML original
            const divRegex = /<div[^>]*>([\s\S]*?)<\/div>/gi;
            let divMatch;
            let foundMatch = false;
            
            while ((divMatch = divRegex.exec(htmlContent)) !== null) {
              const divContent = divMatch[1];
              const plainText = divContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
              
              // Verifica se este div corresponde ao nosso bloco
              if (plainText === block.text) {
                foundMatch = true;
                
                // Processa o HTML com tags inline
                const parts: Array<{ text: string; bold: boolean; italic: boolean }> = [];
                let textWithTags = divContent.replace(/&nbsp;/g, ' ');
                
                // Adiciona espaços ao redor das tags para garantir separação
                textWithTags = textWithTags.replace(/(<\/(?:strong|b|em|i|span)>)(\S)/gi, '$1 $2');
                textWithTags = textWithTags.replace(/(\S)(<(?:strong|b|em|i|span)[^>]*>)/gi, '$1 $2');
                
                // Regex para capturar texto com e sem tags
                const inlineRegex = /<(strong|b)(?:\s[^>]*)?>([^<]*)<\/\1>|<(em|i)(?:\s[^>]*)?>([^<]*)<\/\3>|([^<]+)/gi;
                let inlineMatch;
                
                while ((inlineMatch = inlineRegex.exec(textWithTags)) !== null) {
                  if (inlineMatch[1] && inlineMatch[2]) {
                    // Tag strong ou b
                    const text = inlineMatch[2];
                    if (text) {
                      parts.push({ text: text, bold: true, italic: false });
                    }
                  } else if (inlineMatch[3] && inlineMatch[4]) {
                    // Tag em ou i
                    const text = inlineMatch[4];
                    if (text) {
                      parts.push({ text: text, bold: false, italic: true });
                    }
                  } else if (inlineMatch[5]) {
                    // Texto sem tag
                    let text = inlineMatch[5]
                      .replace(/<\/[^>]+>/g, ' ')
                      .replace(/<[^>]+>/g, ' ');
                    text = cleanHtmlText(text);
                    if (text) {
                      parts.push({ text: text, bold: false, italic: false });
                    }
                  }
                }
                
                // Renderiza cada parte
                parts.forEach((part, index) => {
                  if (!part.text) return;
                  
                  const cleanText = cleanHtmlText(part.text);
                  if (!cleanText) return;
                  
                  // Usa a fonte base do bloco (ex: Courier) ao invés de sempre Helvetica
                  let partFont = baseFont;
                  if (part.bold && part.italic) {
                    partFont = `${baseFont}-BoldOblique`;
                    // Fallback para fontes que não têm todas as variantes
                    if (!['Helvetica', 'Times-Roman', 'Courier'].includes(baseFont)) {
                      partFont = baseFont;
                    }
                  } else if (part.bold) {
                    partFont = `${baseFont}-Bold`;
                    if (!['Helvetica', 'Times-Roman', 'Courier'].includes(baseFont)) {
                      partFont = baseFont;
                    }
                  } else if (part.italic) {
                    partFont = `${baseFont}-Oblique`;
                    if (baseFont === 'Times-Roman') {
                      partFont = 'Times-Italic';
                    } else if (baseFont === 'Courier') {
                      partFont = 'Courier-Oblique';
                    } else if (!['Helvetica'].includes(baseFont)) {
                      partFont = baseFont;
                    }
                  }
                  
                  doc.font(partFont).text(cleanText, {
                    continued: index < parts.length - 1,
                    align: index === 0 ? (block.align || 'left') : undefined
                  });
                });
                
                break;
              }
            }
            
            return foundMatch;
          };
          
          // Tenta renderizar com formatação inline, senão usa método simples
          if (!renderWithInlineFormatting()) {
            const cleanText = cleanHtmlText(block.text);
            doc.font(font).text(cleanText, { 
              align: block.align || 'left',
              continued: false
            });
          }
          
          doc.moveDown(0.5);
        }
      }

      // Finalizar o PDF
      doc.end();
    } catch (error) {
      logger.error('Erro ao gerar PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar PDF'
      });
    }
  }
}
