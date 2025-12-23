import { Request, Response } from 'express';
import { ClienteArquivoService, CreateClienteArquivoData, UpdateClienteArquivoData } from '../services/clienteArquivoService';
import { logger } from '../utils/logger';
import Joi from 'joi';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../services/AuditoriaService';
import type { AuthenticatedRequest } from '../types/auth';
import { ClienteArquivo } from '../models/ClienteArquivo';

export class ClienteArquivoController {
  private static createSchema = Joi.object({
    cliente_id: Joi.number().integer().required(),
    nome: Joi.string().min(1).max(255).required(),
    tipo: Joi.string().valid('documento', 'foto', 'assinatura', 'outro').required(),
    descricao: Joi.string().allow(null, '').optional(),
    origem: Joi.string().valid('manual', 'assinatura_digital', 'sistema').default('manual'),
    referencia_id: Joi.number().integer().allow(null).optional(),
    referencia_tipo: Joi.string().max(100).allow(null, '').optional()
  });

  private static updateSchema = Joi.object({
    nome: Joi.string().min(1).max(255),
    descricao: Joi.string().allow(null, '')
  });

  /**
   * Lista arquivos de um cliente
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { cliente_id } = req.params;
      const { tipo, origem } = req.query;

      if (!cliente_id) {
        res.status(400).json({
          success: false,
          message: 'cliente_id é obrigatório'
        });
        return;
      }

      const arquivos = await ClienteArquivoService.list(Number(cliente_id), {
        tipo: tipo as string | undefined,
        origem: origem as string | undefined
      });

      res.json({
        success: true,
        data: arquivos
      });
    } catch (error) {
      logger.error('Erro ao listar arquivos do cliente', { error });
      res.status(500).json({
        success: false,
        message: 'Erro ao listar arquivos do cliente'
      });
    }
  }

  /**
   * Busca arquivo por ID
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const arquivo = await ClienteArquivoService.getById(Number(id));

      if (!arquivo) {
        res.status(404).json({
          success: false,
          message: 'Arquivo não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: arquivo
      });
    } catch (error) {
      logger.error('Erro ao buscar arquivo', { error });
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar arquivo'
      });
    }
  }

  /**
   * Cria novo arquivo
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      // Validar dados do body (excluindo arquivo que vem do multer)
      const { error, value } = ClienteArquivoController.createSchema.validate(req.body);

      if (error) {
        res.status(400).json({
          success: false,
          message: error.details[0].message
        });
        return;
      }

      // Verificar se arquivo foi enviado
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Arquivo é obrigatório'
        });
        return;
      }

      const createData: CreateClienteArquivoData = {
        cliente_id: value.cliente_id,
        nome: value.nome || req.file.originalname,
        tipo: value.tipo,
        arquivo: req.file,
        mime_type: req.file.mimetype,
        descricao: value.descricao || null,
        origem: value.origem || 'manual',
        referencia_id: value.referencia_id || null,
        referencia_tipo: value.referencia_tipo || null
      };

      const arquivo = await ClienteArquivoService.create(createData);

      await registrarCriacao(
        req as AuthenticatedRequest,
        'ClienteArquivo',
        arquivo.id,
        arquivo.toJSON() as Record<string, unknown>
      );

      res.status(201).json({
        success: true,
        message: 'Arquivo criado com sucesso',
        data: arquivo
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao criar arquivo', { error: errorMessage });
      res.status(500).json({
        success: false,
        message: errorMessage
      });
    }
  }

  /**
   * Atualiza arquivo
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { error, value } = ClienteArquivoController.updateSchema.validate(req.body);

      if (error) {
        res.status(400).json({
          success: false,
          message: error.details[0].message
        });
        return;
      }

      const arquivoAntes = await ClienteArquivo.findByPk(Number(id));
      const dadosAnteriores = arquivoAntes ? arquivoAntes.toJSON() : null;

      const arquivo = await ClienteArquivoService.update(Number(id), value as UpdateClienteArquivoData);

      await registrarAtualizacao(
        req as AuthenticatedRequest,
        'ClienteArquivo',
        arquivo.id,
        dadosAnteriores as Record<string, unknown>,
        arquivo.toJSON() as Record<string, unknown>
      );

      res.json({
        success: true,
        message: 'Arquivo atualizado com sucesso',
        data: arquivo
      });
    } catch (error) {
      logger.error('Erro ao atualizar arquivo', { error });
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao atualizar arquivo'
      });
    }
  }

  /**
   * Deleta arquivo
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const arquivo = await ClienteArquivo.findByPk(Number(id));
      const dadosAnteriores = arquivo ? arquivo.toJSON() : null;

      await ClienteArquivoService.delete(Number(id));

      if (arquivo && dadosAnteriores) {
        await registrarExclusao(
          req as AuthenticatedRequest,
          'ClienteArquivo',
          arquivo.id,
          dadosAnteriores as Record<string, unknown>
        );
      }

      res.json({
        success: true,
        message: 'Arquivo deletado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao deletar arquivo', { error });
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao deletar arquivo'
      });
    }
  }

  /**
   * Download arquivo
   */
  static async download(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const arquivo = await ClienteArquivoService.getById(Number(id));

      if (!arquivo) {
        res.status(404).json({
          success: false,
          message: 'Arquivo não encontrado'
        });
        return;
      }

      const buffer = await ClienteArquivoService.getFileContent(Number(id));
      const isView = req.query.view === 'true';

      res.setHeader('Content-Type', arquivo.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', isView 
        ? `inline; filename="${arquivo.nome}"` 
        : `attachment; filename="${arquivo.nome}"`);
      
      if (!isView) {
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      }
      
      res.send(buffer);
    } catch (error) {
      logger.error('Erro ao fazer download do arquivo', { 
        id: req.params.id,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao fazer download do arquivo'
      });
    }
  }
}
