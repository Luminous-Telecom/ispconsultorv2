import { Request, Response } from 'express';
import { ModeloDocumento } from '../models/ModeloDocumento';
import { Cliente } from '../models/Cliente';
import { Contrato } from '../models/Contrato';
import { Plano } from '../models/Plano';
import { Titulo } from '../models/Titulo';
import { Op } from 'sequelize';
import { logger } from '../utils/logger';
import { VariaveisDocumentoService } from '../services/VariaveisDocumentoService';
import { PDFGenerationService } from '../services/pdf-generation/PDFGenerationService';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../services/AuditoriaService';
import { setAuditData } from '../middleware/auditMiddleware';
import type { AuthenticatedRequest } from '../types/auth';
import type { TituloComRelacoes } from './titulos/types';

export class ModeloReciboController {
  /**
   * Listar todos os recibos
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const recibos = await ModeloDocumento.findAll({
        where: { tipo: 'recibo' },
        order: [['created_at', 'DESC']],
      });

      res.json({
        success: true,
        data: recibos,
        message: 'Recibos listados com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao listar recibos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar recibo por ID
   */
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const recibo = await ModeloDocumento.findOne({
        where: { 
          id: parseInt(id),
          tipo: 'recibo'
        }
      });

      if (!recibo) {
        res.status(404).json({
          success: false,
          message: 'Recibo não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: recibo,
        message: 'Recibo encontrado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao buscar recibo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar novo recibo
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { nome, conteudo, descricao, ativo, tamanho_maximo, tipos_permitidos, retencao_dias, auto_backup, criptografia } = req.body;

      const recibo = await ModeloDocumento.create({
        nome,
        tipo: 'recibo',
        conteudo,
        descricao,
        ativo: ativo !== undefined ? ativo : true,
        tamanho_maximo: tamanho_maximo || 10485760,
        tipos_permitidos: tipos_permitidos || 'pdf,doc,docx,xls,xlsx',
        retencao_dias: retencao_dias || 365,
        auto_backup: auto_backup || false,
        criptografia: criptografia || false,
      });

      await registrarCriacao(
        req as AuthenticatedRequest,
        'ModeloDocumento',
        recibo.id,
        recibo.toJSON() as unknown as Record<string, unknown>
      );

      res.status(201).json({
        success: true,
        data: recibo,
        message: 'Recibo criado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao criar recibo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualizar recibo
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const recibo = await ModeloDocumento.findOne({
        where: { 
          id: parseInt(id),
          tipo: 'recibo'
        }
      });

      if (!recibo) {
        res.status(404).json({
          success: false,
          message: 'Recibo não encontrado'
        });
        return;
      }

      const dadosAnteriores = recibo.toJSON() as unknown as Record<string, unknown>;
      const { tipo, ...dataToUpdate } = updateData;
      
      await recibo.update(dataToUpdate);
      await recibo.reload();

      const dadosNovos = recibo.toJSON() as unknown as Record<string, unknown>;
      setAuditData(req, dadosAnteriores, dadosNovos);

      await registrarAtualizacao(
        req as AuthenticatedRequest,
        'ModeloDocumento',
        recibo.id,
        dadosAnteriores,
        dadosNovos
      );

      res.json({
        success: true,
        data: recibo,
        message: 'Recibo atualizado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao atualizar recibo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Deletar recibo
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const recibo = await ModeloDocumento.findOne({
        where: { 
          id: parseInt(id),
          tipo: 'recibo'
        }
      });

      if (!recibo) {
        res.status(404).json({
          success: false,
          message: 'Recibo não encontrado'
        });
        return;
      }

      const dadosAnteriores = recibo.toJSON() as unknown as Record<string, unknown>;
      setAuditData(req, dadosAnteriores);
      await recibo.destroy();

      await registrarExclusao(
        req as AuthenticatedRequest,
        'ModeloDocumento',
        recibo.id,
        dadosAnteriores
      );

      res.json({
        success: true,
        message: 'Recibo deletado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao deletar recibo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Gerar PDF do recibo usando html-pdf-node (Puppeteer)
   */
  static async generatePdf(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const recibo = await ModeloDocumento.findOne({
        where: { 
          id: parseInt(id),
          tipo: 'recibo'
        }
      });

      if (!recibo) {
        res.status(404).json({
          success: false,
          message: 'Recibo não encontrado'
        });
        return;
      }

      const pdfBuffer = await PDFGenerationService.generateFromContent(
        recibo.conteudo,
        'html-pdf-node',
        {
          format: 'A4',
          margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
          printBackground: true
        }
      );

      // Configurar headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${recibo.nome}.pdf"`);
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
   * Gerar PDF de teste com dados de um cliente
   */
  static async generateTestPdf(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { cliente_id } = req.query;

      const recibo = await ModeloDocumento.findOne({
        where: { 
          id: parseInt(id),
          tipo: 'recibo'
        }
      });

      if (!recibo) {
        res.status(404).json({
          success: false,
          message: 'Recibo não encontrado'
        });
        return;
      }

      // Buscar cliente se fornecido
      let conteudoProcessado = recibo.conteudo;
      
      if (cliente_id) {
        const cliente = await Cliente.findByPk(cliente_id as string);
        
        if (!cliente) {
          res.status(404).json({
            success: false,
            message: 'Cliente não encontrado'
          });
          return;
        }

        // Buscar contrato ativo do cliente
        const contrato = await Contrato.findOne({
          where: { cliente_id: cliente.id, status: 'ativo' },
          include: [{ model: Plano, as: 'plano' }]
        });

        // Processar variáveis do documento
        conteudoProcessado = await VariaveisDocumentoService.processarVariaveis(
          recibo.conteudo,
          {
            cliente,
            contrato: contrato || undefined
          }
        );
      }

      // Prepara o HTML completo - apenas estilos mínimos, conteúdo do editor será renderizado como está
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            /* Estilos mínimos - apenas para garantir funcionamento básico do PDF */
            /* O conteúdo do editor será renderizado com seus próprios estilos inline */
            
            /* Evitar quebra de página dentro de imagens */
            img {
              page-break-inside: avoid;
            }
            
            /* Ocultar parágrafos vazios */
            p:empty {
              display: none;
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
      logger.error('Erro ao gerar PDF de teste:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar PDF de teste'
      });
    }
  }

  /**
   * Listar variáveis disponíveis para recibos
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

  /**
   * Imprimir recibos de múltiplos títulos pagos
   */
  static async imprimirRecibosMultiplos(req: Request, res: Response): Promise<void> {
    try {
      const idsParam = req.query.ids as string;
      
      if (!idsParam) {
        res.status(400).json({ success: false, message: 'IDs dos títulos não fornecidos' });
        return;
      }

      const ids = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

      if (ids.length === 0) {
        res.status(400).json({ success: false, message: 'IDs dos títulos inválidos' });
        return;
      }

      // Buscar títulos pagos com suas relações
      const titulos = await Titulo.findAll({
        where: { 
          id: { [Op.in]: ids },
          status: { [Op.in]: ['pago', 'pago_atraso'] }
        },
        include: [
          { model: Cliente, as: 'cliente', required: false },
          { model: Plano, as: 'plano', required: false }
        ]
      });

      if (titulos.length === 0) {
        res.status(404).json({ success: false, message: 'Nenhum título pago encontrado' });
        return;
      }

      const recibo = await ModeloDocumento.findOne({
        where: { tipo: 'recibo', ativo: true },
        order: [['created_at', 'DESC']]
      });

      if (!recibo) {
        res.status(404).json({ success: false, message: 'Nenhum modelo de recibo encontrado. Configure um modelo de recibo primeiro.' });
        return;
      }

      const recibosHtml: string[] = [];

      for (const titulo of titulos) {
        try {
          const tituloComRelacoes = titulo as TituloComRelacoes;
          const cliente = tituloComRelacoes.cliente;

          if (!cliente) {
            logger.warn(`Título ${titulo.id} sem cliente associado`);
            continue;
          }

          const contrato = titulo.contrato_id 
            ? await Contrato.findByPk(titulo.contrato_id, {
                include: [{ model: Plano, as: 'plano', required: false }]
              })
            : null;

          const conteudoProcessado = await VariaveisDocumentoService.processarVariaveis(
            recibo.conteudo,
            { cliente, contrato: contrato || undefined, titulo: tituloComRelacoes }
          );

          recibosHtml.push(`<div style="page-break-after: always;">${conteudoProcessado}</div>`);
        } catch (error) {
          logger.error(`Erro ao processar recibo para título ${titulo.id}:`, error);
        }
      }

      if (recibosHtml.length === 0) {
        res.status(500).json({ success: false, message: 'Nenhum recibo pôde ser gerado' });
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            /* Estilos mínimos - apenas para garantir funcionamento básico do PDF */
            /* O conteúdo do editor será renderizado com seus próprios estilos inline */
            
            /* Evitar quebra de página dentro de imagens */
            img {
              page-break-inside: avoid;
            }
            
            /* Ocultar parágrafos vazios */
            p:empty {
              display: none;
            }
          </style>
        </head>
        <body>${recibosHtml.join('')}</body>
        </html>
      `;

      // Se for para imprimir diretamente, retornar HTML
      if (req.query.print === 'true') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(htmlContent);
        return;
      }

      // Caso contrário, gerar PDF
      const pdfBuffer = await PDFGenerationService.generateFromHtml(htmlContent, 'html-pdf-node', {
        format: 'A4',
        margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
        printBackground: true
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="recibos-pagamento.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Erro ao imprimir recibos múltiplos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar recibos'
      });
    }
  }
}
