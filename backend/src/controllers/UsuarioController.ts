import { Request, Response } from 'express';
import { Usuario } from '../models/Usuario';
import { Op, WhereOptions } from 'sequelize';
import * as Joi from 'joi';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { logger } from '../utils/logger';
import { setAuditData } from '../middleware/auditMiddleware';

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
        (whereClause as Record<symbol, unknown>)[Op.or] = [
          { nome: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ];
      }

      if (ativo !== undefined) {
        whereClause.ativo = ativo === 'true';
      }

      const { count, rows } = await Usuario.findAndCountAll({
        where: whereClause,
        order: [['id', 'DESC']],
        limit: limitNum,
        offset
      });

      res.json({
        success: true,
        data: rows,
        pagination: {
          current_page: pageNum,
          per_page: limitNum,
          total: count,
          last_page: Math.ceil(count / limitNum),
          from: offset + 1,
          to: Math.min(offset + limitNum, count)
        }
      });
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
      const usuario = await Usuario.findByPk(id);

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

      const usuarioExistente = await Usuario.findOne({
        where: { email: value.email }
      });

      if (usuarioExistente) {
        res.status(400).json({
          success: false,
          message: 'Email já cadastrado'
        });
        return;
      }

      const passwordHash = await bcrypt.hash(value.password, 10);

      const usuario = await Usuario.create({
        nome: value.nome,
        email: value.email,
        password_hash: passwordHash,
        role: value.role || 'admin',
        ativo: value.ativo !== undefined ? value.ativo : true
      });

      // Registrar auditoria
      const { registrarCriacao } = await import('../services/AuditoriaService');
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

      const usuario = await Usuario.findByPk(id);

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
        const emailExistente = await Usuario.findOne({
          where: { email: value.email }
        });

        if (emailExistente) {
          res.status(400).json({
            success: false,
            message: 'Email já cadastrado'
          });
          return;
        }
      }

      const updateData: Partial<Usuario> = {};
      if (value.nome) updateData.nome = value.nome;
      if (value.email) updateData.email = value.email;
      if (value.role) updateData.role = value.role;
      if (value.ativo !== undefined) updateData.ativo = value.ativo;
      
      if (value.password) {
        updateData.password_hash = await bcrypt.hash(value.password, 10);
      }

      await usuario.update(updateData);
      
      // Recarregar usuário para obter dados atualizados
      await usuario.reload();
      
      // Registrar auditoria
      const { registrarAtualizacao } = await import('../services/AuditoriaService');
      const dadosNovos = { ...usuario.toJSON(), password_hash: '[REDACTED]' } as Record<string, unknown>;
      
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

      const usuario = await Usuario.findByPk(id);

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
      const { registrarExclusao } = await import('../services/AuditoriaService');
      await registrarExclusao(
        req,
        'Usuario',
        usuario.id,
        dadosAnteriores
      );

      await usuario.destroy();

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

      const usuario = await Usuario.findByPk(id);

      if (!usuario) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      const novoSecret = randomBytes(32).toString('hex');
      await usuario.update({ webhook_secret: novoSecret });

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

