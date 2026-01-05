import { Request, Response } from 'express';
import { NotaFiscal } from '../models/NotaFiscal';
import { Cliente } from '../models/Cliente';
import { Titulo } from '../models/Titulo';
import { NFeService, DadosNFe } from '../services/NFeService';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import Joi from 'joi';
import { registrarCriacao } from '../services/AuditoriaService';
import { registrarCriacaoElasticsearch } from '../services/elasticsearch/ElasticsearchAuditService';
import type { AuthenticatedRequest } from '../types/auth';

export class NotaFiscalController {
  // Schema de validação para criação
  private static createSchema = Joi.object({
    cliente_id: Joi.number().integer().positive().required().messages({
      'any.required': 'ID do cliente é obrigatório',
      'number.base': 'ID do cliente deve ser um número',
      'number.positive': 'ID do cliente deve ser positivo'
    }),
    titulo_id: Joi.number().integer().positive().allow(null, ''),
    natureza_operacao: Joi.string().max(100).allow(null, ''),
    // Aceitar string (YYYY-MM-DD) ou Date para evitar conversão de timezone pelo Joi
    data_emissao: Joi.alternatives().try(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/), Joi.date()).allow(null, ''),
    data_vencimento: Joi.alternatives().try(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/), Joi.date()).allow(null, ''),
    valor_total: Joi.number().positive().required().messages({
      'any.required': 'Valor total é obrigatório',
      'number.base': 'Valor total deve ser um número',
      'number.positive': 'Valor total deve ser maior que zero'
    }),
    valor_servicos: Joi.number().min(0).allow(null, ''),
    valor_produtos: Joi.number().min(0).allow(null, ''),
    valor_desconto: Joi.number().min(0).allow(null, ''),
    aliquota_iss: Joi.number().min(0).max(100).allow(null, ''),
    descricao: Joi.string().allow(null, ''),
    observacoes: Joi.string().allow(null, ''),
    modelo: Joi.number().integer().valid(55, 65).allow(null, ''),
    cfop: Joi.string().length(4).allow(null, ''),
    cst_icms: Joi.string().length(3).allow(null, '')
  });

  /**
   * Lista todas as notas fiscais
   */
  static async index(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = '1',
        limit = '15',
        search = '',
        searchField,
        status,
        cliente_id,
        data_inicio,
        data_fim
      } = req.query;

      const pageNumber = parseInt(page as string, 10);
      const limitNumber = parseInt(limit as string, 10);
      const offset = (pageNumber - 1) * limitNumber;

      const where: any = {};

      if (search) {
        const searchTerm = (search as string).trim();
        const isNumericSearch = !isNaN(Number(searchTerm));
        const termNum = parseInt(searchTerm, 10);
        const likePattern = `%${searchTerm}%`;

        if (searchField && typeof searchField === 'string') {
          switch (searchField) {
            case 'id':
              if (isNumericSearch) {
                where.id = termNum;
              } else {
                where.id = { [Op.eq]: -1 };
              }
              break;
            case 'numero':
              where.numero = { [Op.like]: likePattern };
              break;
            case 'chave_acesso':
              where.chave_acesso = { [Op.like]: likePattern };
              break;
            case 'protocolo':
              where.protocolo = { [Op.like]: likePattern };
              break;
            case 'valor':
              if (isNumericSearch) {
                where.valor_total = {
                  [Op.between]: [termNum * 0.9, termNum * 1.1]
                };
              } else {
                where.id = { [Op.eq]: -1 };
              }
              break;
            case 'status':
              where.status = { [Op.like]: likePattern };
              break;
            case 'nfse_status':
              where.nfse_status = { [Op.like]: likePattern };
              break;
            case 'titulo_id':
              if (isNumericSearch) {
                where.titulo_id = termNum;
              } else {
                where.id = { [Op.eq]: -1 };
              }
              break;
            case 'cliente':
              where[Op.or] = [
                sequelize.literal(`EXISTS (SELECT 1 FROM clientes WHERE clientes.id = notas_fiscais.cliente_id AND (clientes.razao_social LIKE '${searchTerm.replace(/'/g, "''")}' OR clientes.nome_fantasia LIKE '${searchTerm.replace(/'/g, "''")}'))`)
              ];
              break;
            default:
              where[Op.or] = [
                { numero: { [Op.like]: likePattern } },
                { chave_acesso: { [Op.like]: likePattern } },
                { protocolo: { [Op.like]: likePattern } }
              ];
          }
        } else {
          const orConditions: any[] = [
            { numero: { [Op.like]: likePattern } },
            { chave_acesso: { [Op.like]: likePattern } },
            { protocolo: { [Op.like]: likePattern } }
          ];
          
          if (isNumericSearch) {
            orConditions.push({ id: termNum });
            orConditions.push({ titulo_id: termNum });
          }
          
          where[Op.or] = orConditions;
        }
      }

      if (status) {
        where.status = status;
      }

      if (cliente_id) {
        where.cliente_id = cliente_id;
      }

      if (data_inicio || data_fim) {
        where.data_emissao = {};
        if (data_inicio) {
          where.data_emissao[Op.gte] = new Date(data_inicio as string);
        }
        if (data_fim) {
          where.data_emissao[Op.lte] = new Date(data_fim as string);
        }
      }

      const { count, rows } = await NotaFiscal.findAndCountAll({
        where,
        include: [
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: limitNumber,
        offset
      });

      res.json({
        success: true,
        data: rows,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: count,
          totalPages: Math.ceil(count / limitNumber)
        }
      });
    } catch (error) {
      logger.error('Erro ao listar notas fiscais:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar notas fiscais',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Busca uma nota fiscal por ID
   */
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const notaFiscal = await NotaFiscal.findByPk(id, {
        include: [
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj', 'email', 'telefone', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'cep']
          }
        ]
      });

      if (!notaFiscal) {
        res.status(404).json({
          success: false,
          message: 'Nota fiscal não encontrada'
        });
        return;
      }

      res.json({
        success: true,
        data: notaFiscal
      });
    } catch (error) {
      logger.error('Erro ao buscar nota fiscal:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar nota fiscal',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Gera uma nota fiscal individual
   */
  static async gerar(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = NotaFiscalController.createSchema.validate(req.body);

      if (error) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const dados: DadosNFe = value;
      
      
      const resultado = await NFeService.gerarNFe(dados);

      if (resultado.success && resultado.notaFiscal) {
        try {
          const notaData = resultado.notaFiscal.toJSON() as Record<string, unknown>;
          await registrarCriacao(
            req,
            'NotaFiscal',
            resultado.notaFiscal.id,
            notaData
          );
          await registrarCriacaoElasticsearch(
            req as AuthenticatedRequest,
            'NotaFiscal',
            resultado.notaFiscal.id,
            notaData
          );
        } catch (auditError) {
          logger.error('Erro ao registrar auditoria de criação da NFS-e', {
            nota_id: resultado.notaFiscal.id,
            cliente_id: resultado.notaFiscal.cliente_id,
            titulo_id: resultado.notaFiscal.titulo_id,
            error: auditError instanceof Error ? auditError.message : 'Erro desconhecido',
            stack: auditError instanceof Error ? auditError.stack : undefined
          });
        }

        res.status(201).json({
          success: true,
          message: resultado.mensagem || 'NFS-e gerada com sucesso',
          data: resultado.notaFiscal
        });
      } else {
        res.status(400).json({
          success: false,
          message: resultado.mensagem || 'Erro ao gerar NFS-e',
          erro: resultado.erro,
          data: resultado.notaFiscal || null
        });
      }
    } catch (error) {
      logger.error('Erro ao gerar NFS-e:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao gerar NFS-e',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Consulta status de uma nota fiscal
   */
  static async consultarStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const resultado = await NFeService.consultarStatus(parseInt(id, 10));

      if (resultado.success) {
        res.json({
          success: true,
          status: resultado.status
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Erro ao consultar status',
          erro: resultado.erro
        });
      }
    } catch (error) {
      logger.error('Erro ao consultar status da NFS-e:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao consultar status',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Cancela uma nota fiscal
   */
  static async cancelar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { justificativa } = req.body;

      if (!justificativa || justificativa.length < 15) {
        res.status(400).json({
          success: false,
          message: 'Justificativa é obrigatória e deve ter pelo menos 15 caracteres'
        });
        return;
      }

      const resultado = await NFeService.cancelarNFe(parseInt(id, 10), justificativa);

      if (resultado.success) {
        res.json({
          success: true,
          message: resultado.mensagem || 'NFS-e cancelada com sucesso'
        });
      } else {
        res.status(400).json({
          success: false,
          message: resultado.mensagem || 'Erro ao cancelar NFS-e',
          erro: resultado.erro
        });
      }
    } catch (error) {
      logger.error('Erro ao cancelar NFS-e:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao cancelar NFS-e',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Lista notas fiscais de um cliente específico
   */
  static async listarPorCliente(req: Request, res: Response): Promise<void> {
    try {
      const { cliente_id } = req.params;
      const {
        page = '1',
        limit = '15'
      } = req.query;

      const pageNumber = parseInt(page as string, 10);
      const limitNumber = parseInt(limit as string, 10);
      const offset = (pageNumber - 1) * limitNumber;

      const { count, rows } = await NotaFiscal.findAndCountAll({
        where: { cliente_id: parseInt(cliente_id, 10) },
        order: [['created_at', 'DESC']],
        limit: limitNumber,
        offset
      });

      res.json({
        success: true,
        data: rows,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: count,
          totalPages: Math.ceil(count / limitNumber)
        }
      });
    } catch (error) {
      logger.error('Erro ao listar notas fiscais do cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar notas fiscais do cliente',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Busca PDF de uma nota fiscal (gera usando modelo próprio)
   */
  private static async getPdfBuffer(notaFiscal: NotaFiscal): Promise<Buffer | null> {
    try {
      const notaCompleta = await NotaFiscal.findByPk(notaFiscal.id, {
        include: [
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'cep', 'telefone', 'email']
          }
        ]
      }) as (NotaFiscal & { cliente?: Cliente | null }) | null;

      if (!notaCompleta || !notaCompleta.cliente) {
        return null;
      }


      const { NotaFiscalPDFService } = await import('../services/NotaFiscalPDFService');
      return await NotaFiscalPDFService.gerarPdf(notaCompleta);
    } catch (error) {
      logger.error('Erro ao gerar PDF da NFS-e', {
        nota_id: notaFiscal.id,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }

  /**
   * Imprime uma NFS-e por ID
   */
  static async imprimir(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const notaFiscalId = parseInt(id, 10);

      if (isNaN(notaFiscalId)) {
        res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
        return;
      }

      const notaFiscal = await NotaFiscal.findByPk(notaFiscalId);

      if (!notaFiscal) {
        res.status(404).json({
          success: false,
          message: 'NFS-e não encontrada'
        });
        return;
      }

      const pdfBuffer = await NotaFiscalController.getPdfBuffer(notaFiscal);

      if (!pdfBuffer) {
        res.status(404).json({
          success: false,
          message: 'PDF da NFS-e não encontrado. A nota pode ainda estar sendo processada.'
        });
        return;
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="nfse-${notaFiscal.numero || notaFiscalId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Erro ao imprimir NFS-e:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao imprimir NFS-e',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Imprime múltiplas NFS-e
   */
  static async imprimirMultiplas(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.query;

      if (!ids || typeof ids !== 'string') {
        res.status(400).json({
          success: false,
          message: 'IDs das NFS-e não fornecidos'
        });
        return;
      }

      const idsArray = ids.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

      if (idsArray.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Nenhum ID válido fornecido'
        });
        return;
      }

      // Para cada título, buscar sua NF específica
      const pdfBuffers: Buffer[] = [];

      for (const tituloId of idsArray) {
        const titulo = await Titulo.findByPk(tituloId);
        if (!titulo?.nota_fiscal_id) continue;

        const notaFiscal = await NotaFiscal.findByPk(titulo.nota_fiscal_id);
        if (notaFiscal?.nfse_status === 'emitida' && notaFiscal.numero) {
          const pdfBuffer = await NotaFiscalController.getPdfBuffer(notaFiscal);
          if (pdfBuffer) pdfBuffers.push(pdfBuffer);
        }
      }

      if (pdfBuffers.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Nenhum título com NFS-e emitida encontrado'
        });
        return;
      }

      // Retornar o primeiro PDF válido encontrado
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="nfse-${idsArray[0]}.pdf"`);
      res.send(pdfBuffers[0]);
    } catch (error) {
      logger.error('Erro ao imprimir múltiplas NFS-e:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao imprimir NFS-e',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}
