import { Request, Response } from 'express';
import { ClienteArquivoService, CreateClienteArquivoData, UpdateClienteArquivoData } from '../services/clienteArquivoService';
import { logger } from '../utils/logger';
import Joi from 'joi';

export class ClienteArquivoController {
  private static createSchema = Joi.object({
    cliente_id: Joi.number().integer().required(),
    nome: Joi.string().min(1).max(255).required(),
    tipo: Joi.string().valid('documento', 'foto', 'assinatura', 'outro').required(),
    arquivo_base64: Joi.string().required(),
    mime_type: Joi.string().max(100).allow(null, ''),
    descricao: Joi.string().allow(null, ''),
    origem: Joi.string().valid('manual', 'assinatura_digital', 'sistema').default('manual'),
    referencia_id: Joi.number().integer().allow(null),
    referencia_tipo: Joi.string().max(100).allow(null, '')
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
      const { error, value } = this.createSchema.validate(req.body);

      if (error) {
        res.status(400).json({
          success: false,
          message: error.details[0].message
        });
        return;
      }

      const arquivo = await ClienteArquivoService.create(value as CreateClienteArquivoData);

      res.status(201).json({
        success: true,
        message: 'Arquivo criado com sucesso',
        data: arquivo
      });
    } catch (error) {
      logger.error('Erro ao criar arquivo', { error });
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao criar arquivo'
      });
    }
  }

  /**
   * Atualiza arquivo
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { error, value } = this.updateSchema.validate(req.body);

      if (error) {
        res.status(400).json({
          success: false,
          message: error.details[0].message
        });
        return;
      }

      const arquivo = await ClienteArquivoService.update(Number(id), value as UpdateClienteArquivoData);

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
      await ClienteArquivoService.delete(Number(id));

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
      logger.info('Tentando fazer download do arquivo', { id, path: req.path });
      
      const arquivo = await ClienteArquivoService.getById(Number(id));

      if (!arquivo) {
        logger.warn('Arquivo não encontrado no banco de dados', { id });
        res.status(404).json({
          success: false,
          message: 'Arquivo não encontrado'
        });
        return;
      }

      logger.info('Arquivo encontrado no banco', { id, caminho: arquivo.caminho, nome: arquivo.nome });

      const buffer = await ClienteArquivoService.getFileContent(Number(id));

      res.setHeader('Content-Type', arquivo.mime_type || 'application/octet-stream');
      
      // Verificar se é para visualização (query param view) ou download
      const isView = req.query.view === 'true';
      if (isView) {
        // Para visualização, remover X-Frame-Options para permitir exibição em iframe cross-origin
        // O middleware já não aplica X-Frame-Options para esta rota, mas garantimos removendo qualquer header existente
        res.removeHeader('X-Frame-Options');
        res.setHeader('Content-Disposition', `inline; filename="${arquivo.nome}"`);
      } else {
        // Para download, usar attachment e manter proteção de frame
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('Content-Disposition', `attachment; filename="${arquivo.nome}"`);
      }
      
      res.send(buffer);
    } catch (error) {
      logger.error('Erro ao fazer download do arquivo', { 
        id: req.params.id,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao fazer download do arquivo'
      });
    }
  }
}
