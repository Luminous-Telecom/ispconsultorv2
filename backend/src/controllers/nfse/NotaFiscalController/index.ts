import { Request, Response } from 'express';
import { NFeService, DadosNFe } from '../../../services/nfse/NFeService';
import { NotaFiscalService } from '../../../services/nfse/NotaFiscalService';
import { NotaFiscalPdfService } from '../../../services/nfse/NotaFiscalPdfService';
import { TituloService } from '../../../services/financeiro/TituloService';
import { logger } from '../../../utils/logger';
import Joi from 'joi';
import { registrarCriacao } from '../../../services/sistema/AuditoriaService/index';
import type { AuthenticatedRequest } from '../../../types/auth';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';

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
        data_fim,
        sortColumn,
        sortDirection
      } = req.query;

      const pageNumber = parseInt(page as string, 10);
      const limitNumber = parseInt(limit as string, 10);

      // Passar parâmetros diretamente para o service (que já constrói os filtros internamente)
      const result = await NotaFiscalService.list({
        page: pageNumber,
        limit: limitNumber,
        search: search as string,
        searchField: searchField as string,
        status: status as string,
        cliente_id: cliente_id ? parseInt(String(cliente_id), 10) : undefined,
        data_inicio: data_inicio as string,
        data_fim: data_fim as string,
        sortColumn: sortColumn as string,
        sortDirection: sortDirection as string
      });

      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar notas fiscais', 500, true);
    }
  }

  /**
   * Busca uma nota fiscal por ID
   */
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const notaFiscal = await NotaFiscalService.getById(id);

      if (!notaFiscal) {
        sendNotFound(res, 'Nota fiscal não encontrada');
        return;
      }

      sendSuccess(res, notaFiscal);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar nota fiscal', 500, true);
    }
  }

  /**
   * Gera uma nota fiscal individual
   */
  static async gerar(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = NotaFiscalController.createSchema.validate(req.body);

      if (error) {
        // Converter para Record<string, string[]> esperado pelo sendValidationError
        const errorsByField: Record<string, string[]> = error.details.reduce((acc, detail) => {
          const field = detail.path.join('.') || 'general';
          if (!acc[field]) {
            acc[field] = [];
          }
          acc[field].push(detail.message);
          return acc;
        }, {} as Record<string, string[]>);
        sendValidationError(res, 'Dados inválidos', errorsByField);
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
        } catch (auditError) {
          logger.error('Erro ao registrar auditoria de criação da NFS-e', {
            nota_id: resultado.notaFiscal.id,
            cliente_id: resultado.notaFiscal.cliente_id,
            titulo_id: resultado.notaFiscal.titulo_id,
            error: auditError instanceof Error ? auditError.message : 'Erro desconhecido',
            stack: auditError instanceof Error ? auditError.stack : undefined
          });
        }

        sendSuccess(res, resultado.notaFiscal, resultado.mensagem || 'NFS-e gerada com sucesso', 201);
      } else {
        sendError(res, new Error(resultado.mensagem || 'Erro ao gerar NFS-e'), resultado.mensagem || 'Erro ao gerar NFS-e', 400, false, {
          erro: resultado.erro,
          data: resultado.notaFiscal || null
        });
      }
    } catch (error) {
      sendError(res, error, 'Erro interno ao gerar NFS-e', 500, true);
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
        sendSuccess(res, { status: resultado.status });
      } else {
        sendError(res, new Error('Erro ao consultar status'), 'Erro ao consultar status', 400, false, {
          erro: resultado.erro
        });
      }
    } catch (error) {
      sendError(res, error, 'Erro interno ao consultar status', 500, true);
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
        sendValidationError(res, 'Justificativa é obrigatória e deve ter pelo menos 15 caracteres');
        return;
      }

      const resultado = await NFeService.cancelarNFe(parseInt(id, 10), justificativa);

      if (resultado.success) {
        sendSuccess(res, undefined, resultado.mensagem || 'NFS-e cancelada com sucesso');
      } else {
        sendError(res, new Error(resultado.mensagem || 'Erro ao cancelar NFS-e'), resultado.mensagem || 'Erro ao cancelar NFS-e', 400, false, {
          erro: resultado.erro
        });
      }
    } catch (error) {
      sendError(res, error, 'Erro interno ao cancelar NFS-e', 500, true);
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

      const result = await NotaFiscalService.findByCliente(
        parseInt(cliente_id, 10),
        pageNumber,
        limitNumber
      );

      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar notas fiscais do cliente', 500, true);
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
        sendValidationError(res, 'ID inválido');
        return;
      }

      const notaFiscal = await NotaFiscalService.getById(notaFiscalId);

      if (!notaFiscal) {
        sendNotFound(res, 'NFS-e não encontrada');
        return;
      }

      const pdfBuffer = await NotaFiscalPdfService.getPdfBuffer(notaFiscal);

      if (!pdfBuffer) {
        sendNotFound(res, 'PDF da NFS-e não encontrado. A nota pode ainda estar sendo processada.');
        return;
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="nfse-${notaFiscal.numero || notaFiscalId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      sendError(res, error, 'Erro interno ao imprimir NFS-e', 500, true);
    }
  }

  /**
   * Imprime múltiplas NFS-e
   */
  static async imprimirMultiplas(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.query;

      if (!ids || typeof ids !== 'string') {
        sendValidationError(res, 'IDs das NFS-e não fornecidos');
        return;
      }

      const idsArray = ids.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

      if (idsArray.length === 0) {
        sendValidationError(res, 'Nenhum ID válido fornecido');
        return;
      }

      // Para cada título, buscar sua NF específica
      const pdfBuffers: Buffer[] = [];

      for (const tituloId of idsArray) {
        const titulo = await TituloService.getById(tituloId);
        if (!titulo?.nota_fiscal_id) continue;

        const notaFiscal = await NotaFiscalService.getById(titulo.nota_fiscal_id);
        if (notaFiscal?.nfse_status === 'emitida' && notaFiscal.numero) {
          const pdfBuffer = await NotaFiscalPdfService.getPdfBuffer(notaFiscal);
          if (pdfBuffer) pdfBuffers.push(pdfBuffer);
        }
      }

      if (pdfBuffers.length === 0) {
        sendNotFound(res, 'Nenhum título com NFS-e emitida encontrado');
        return;
      }

      // Retornar o primeiro PDF válido encontrado
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="nfse-${idsArray[0]}.pdf"`);
      res.send(pdfBuffers[0]);
    } catch (error) {
      sendError(res, error, 'Erro interno ao imprimir NFS-e', 500, true);
    }
  }
}
