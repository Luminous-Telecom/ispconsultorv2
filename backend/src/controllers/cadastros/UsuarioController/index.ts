import { Request, Response } from 'express';
import { Usuario } from '../../../models/cadastros/Usuario';
import { UsuarioService } from '../../../services/cadastros/UsuarioService';
import { Op, WhereOptions } from 'sequelize';
import * as Joi from 'joi';
import { randomBytes } from 'crypto';
import { logger } from '../../../utils/logger';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';

export class UsuarioController {
  private static createSchema = Joi.object({
    nome: Joi.string().min(3).max(150).required(),
    email: Joi.string().email().max(180).required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'user').default('admin'),
    ativo: Joi.boolean().default(true)
  });

  private static updateSchema = Joi.object({
    nome: Joi.string().min(3).max(150),
    email: Joi.string().email().max(180),
    password: Joi.string().min(6),
    role: Joi.string().valid('admin', 'user'),
    ativo: Joi.boolean()
  });

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, search = '', ativo } = req.query;
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;

      const whereClause: WhereOptions = {};
      
      if (search) {
        // Buscar apenas nos campos que correspondem às colunas da tabela
        (whereClause as Record<symbol, unknown>)[Op.or] = [
          { id: { [Op.like]: `%${search}%` } },
          { nome: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { role: { [Op.like]: `%${search}%` } },
          { ativo: { [Op.like]: `%${search}%` } }
        ];
      }

      if (ativo !== undefined) {
        whereClause.ativo = ativo === 'true';
      }

      const result = await UsuarioService.list({
        page: pageNum,
        limit: limitNum,
        search: search as string,
        ativo: ativo as string
      });

      res.json(result);
    } catch (error) {
      logger.error('Erro ao listar usuários', { error });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const usuario = await UsuarioService.getById(id);

      if (!usuario) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: usuario
      });
    } catch (error) {
      logger.error('Erro ao buscar usuário', { error });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = UsuarioController.createSchema.validate(req.body);

      if (error) {
        res.status(400).json({
          success: false,
          message: error.details[0].message
        });
        return;
      }

      const usuarioExistente = await UsuarioService.existsByEmail(value.email);

      if (usuarioExistente) {
        res.status(400).json({
          success: false,
          message: 'Email já cadastrado'
        });
        return;
      }

      const usuario = await UsuarioService.create({
        nome: value.nome,
        email: value.email,
        password: value.password,
        role: value.role || 'admin',
        ativo: value.ativo !== undefined ? value.ativo : true
      });

      // Registrar auditoria
      await registrarCriacao(
        req,
        'Usuario',
        usuario.id,
        { ...usuario.toJSON(), password_hash: '[REDACTED]' } as Record<string, unknown>
      );

      res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        data: usuario
      });
    } catch (error) {
      logger.error('Erro ao criar usuário', { error });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { error, value } = UsuarioController.updateSchema.validate(req.body);

      if (error) {
        res.status(400).json({
          success: false,
          message: error.details[0].message
        });
        return;
      }

      const usuario = await UsuarioService.getById(id);

      if (!usuario) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = { ...usuario.toJSON(), password_hash: '[REDACTED]' } as Record<string, unknown>;

      if (value.email && value.email !== usuario.email) {
        const emailExistente = await UsuarioService.existsByEmail(value.email, usuario.id);

        if (emailExistente) {
          res.status(400).json({
            success: false,
            message: 'Email já cadastrado'
          });
          return;
        }
      }

      const usuarioAtualizado = await UsuarioService.update(id, {
        nome: value.nome,
        email: value.email,
        password: value.password,
        role: value.role,
        ativo: value.ativo
      });
      
      // Registrar auditoria
      const dadosNovos = { ...usuarioAtualizado.toJSON(), password_hash: '[REDACTED]' } as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      await registrarAtualizacao(
        req,
        'Usuario',
        usuario.id,
        dadosAnteriores,
        dadosNovos
      );

      res.json({
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: usuario
      });
    } catch (error) {
      logger.error('Erro ao atualizar usuário', { error });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const usuario = await UsuarioService.getById(id);

      if (!usuario) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = { ...usuario.toJSON(), password_hash: '[REDACTED]' } as Record<string, unknown>;
      
      // Registrar auditoria
      await registrarExclusao(
        req,
        'Usuario',
        usuario.id,
        dadosAnteriores
      );

      await UsuarioService.delete(id);

      res.json({
        success: true,
        message: 'Usuário excluído com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao excluir usuário', { error });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  static async gerarWebhookSecret(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const usuario = await UsuarioService.getById(id);

      if (!usuario) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      const novoSecret = randomBytes(32).toString('hex');
      await UsuarioService.update(id, { webhook_secret: novoSecret });

      logger.info('Webhook secret gerado para usuário', {
        usuario_id: usuario.id
      });

      res.json({
        success: true,
        message: 'Webhook secret gerado com sucesso',
        data: {
          webhook_secret: novoSecret
        }
      });
    } catch (error) {
      logger.error('Erro ao gerar webhook secret', {
        usuario_id: req.params.id,
        error
      });

      res.status(500).json({
        success: false,
        message: 'Erro interno ao gerar webhook secret'
      });
    }
  }
}

