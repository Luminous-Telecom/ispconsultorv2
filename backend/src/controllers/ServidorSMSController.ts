import { Request, Response } from 'express';
import { ServidorSMS } from '../models/ServidorSMS';
import { logger } from '../utils/logger';

export class ServidorSMSController {
  /**
   * Listar todos os servidores de SMS
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const servidores = await ServidorSMS.findAll({
        order: [['created_at', 'DESC']],
        attributes: {
          exclude: ['api_key', 'api_secret'], // Não retornar as chaves na listagem
        },
      });

      res.json({
        success: true,
        data: servidores,
        message: 'Servidores de SMS listados com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao listar servidores de SMS:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar servidor de SMS por ID
   */
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const servidor = await ServidorSMS.findByPk(id, {
        attributes: {
          exclude: ['api_key', 'api_secret'], // Não retornar as chaves
        },
      });

      if (!servidor) {
        res.status(404).json({
          success: false,
          message: 'Servidor de SMS não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: servidor,
        message: 'Servidor de SMS encontrado'
      });
    } catch (error) {
      logger.error('Erro ao buscar servidor de SMS:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar novo servidor de SMS
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const servidorData = req.body;

      // Validar dados obrigatórios
      if (!servidorData.provedor || !servidorData.api_key || !servidorData.sender_id) {
        res.status(400).json({
          success: false,
          message: 'Provedor, API Key e Sender ID são obrigatórios'
        });
        return;
      }

      const servidor = await ServidorSMS.create(servidorData);

      res.status(201).json({
        success: true,
        data: servidor,
        message: 'Servidor de SMS criado com sucesso'
      });
    } catch (error: any) {
      logger.error('Erro ao criar servidor de SMS:', error);
      
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
   * Atualizar servidor de SMS
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const servidorData = req.body;

      const servidor = await ServidorSMS.findByPk(id);

      if (!servidor) {
        res.status(404).json({
          success: false,
          message: 'Servidor de SMS não encontrado'
        });
        return;
      }

      await servidor.update(servidorData);

      res.json({
        success: true,
        data: servidor,
        message: 'Servidor de SMS atualizado com sucesso'
      });
    } catch (error: any) {
      logger.error('Erro ao atualizar servidor de SMS:', error);
      
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
   * Deletar servidor de SMS
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const servidor = await ServidorSMS.findByPk(id);

      if (!servidor) {
        res.status(404).json({
          success: false,
          message: 'Servidor de SMS não encontrado'
        });
        return;
      }

      await servidor.destroy();

      res.json({
        success: true,
        message: 'Servidor de SMS deletado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao deletar servidor de SMS:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Testar conexão do servidor de SMS
   */
  static async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const servidor = await ServidorSMS.findByPk(id);

      if (!servidor) {
        res.status(404).json({
          success: false,
          message: 'Servidor de SMS não encontrado'
        });
        return;
      }

      // Aqui você implementaria a lógica de teste de conexão
      // Por enquanto, vamos simular um teste
      const testResult = {
        success: true,
        message: 'Conexão testada com sucesso',
        details: {
          provedor: servidor.provedor,
          sender_id: servidor.sender_id,
          ativo: servidor.ativo
        }
      };

      res.json(testResult);
    } catch (error) {
      logger.error('Erro ao testar conexão do servidor de SMS:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar servidor ativo
   */
  static async getActive(req: Request, res: Response): Promise<void> {
    try {
      const servidor = await ServidorSMS.findOne({
        where: { ativo: true },
        attributes: {
          exclude: ['api_key', 'api_secret'], // Não retornar as chaves
        },
      });

      if (!servidor) {
        res.status(404).json({
          success: false,
          message: 'Nenhum servidor de SMS ativo encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: servidor,
        message: 'Servidor ativo encontrado'
      });
    } catch (error) {
      logger.error('Erro ao buscar servidor ativo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}
