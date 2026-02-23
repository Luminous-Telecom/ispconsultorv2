import { Request, Response } from 'express';
import { Usuario } from '../../../models/cadastros/Usuario';
import { UsuarioService } from '../../../services/cadastros/UsuarioService';
import { Op, WhereOptions } from 'sequelize';
import * as Joi from 'joi';
import { randomBytes } from 'crypto';
import { logger } from '../../../utils/logger';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

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
      const { page = 1, limit = 10, search = '', ativo, sortColumn, sortDirection } = req.query;
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const empresaId = getEmpresaIdOrNull(req);

      const result = await UsuarioService.list({
        page: pageNum,
        limit: limitNum,
        search: search as string,
        ativo: ativo as string,
        sortColumn: sortColumn as string,
        sortDirection: sortDirection as string,
        empresa_id: empresaId ?? undefined,
      });

      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar usuários', 500, true);
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const usuario = await UsuarioService.getById(id);

      if (!usuario) {
        sendNotFound(res, 'Usuário não encontrado');
        return;
      }

      sendSuccess(res, usuario);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar usuário', 500, true);
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = UsuarioController.createSchema.validate(req.body);

      if (error) {
        sendValidationError(res, error.details[0].message);
        return;
      }

      const usuarioExistente = await UsuarioService.existsByEmail(value.email);

      if (usuarioExistente) {
        sendValidationError(res, 'Email já cadastrado');
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);

      const usuario = await UsuarioService.create({
        nome: value.nome,
        email: value.email,
        password: value.password,
        role: value.role || 'admin',
        ativo: value.ativo !== undefined ? value.ativo : true,
        empresa_id: empresaId ?? undefined,
      });

      // Registrar auditoria
      try {
        await registrarCriacao(
          req,
          'Usuario',
          usuario.id,
          { ...usuario.toJSON(), password_hash: '[REDACTED]' } as Record<string, unknown>
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, usuario, 'Usuário criado com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar usuário', 500, true);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { error, value } = UsuarioController.updateSchema.validate(req.body);

      if (error) {
        sendValidationError(res, error.details[0].message);
        return;
      }

      const usuario = await UsuarioService.getById(id);

      if (!usuario) {
        sendNotFound(res, 'Usuário não encontrado');
        return;
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = { ...usuario.toJSON(), password_hash: '[REDACTED]' } as Record<string, unknown>;

      if (value.email && value.email !== usuario.email) {
        const emailExistente = await UsuarioService.existsByEmail(value.email, usuario.id);

        if (emailExistente) {
          sendValidationError(res, 'Email já cadastrado');
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
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      try {
        await registrarAtualizacao(
          req,
          'Usuario',
          usuario.id,
          dadosAnteriores,
          dadosNovos
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, usuario, 'Usuário atualizado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar usuário', 500, true);
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const usuario = await UsuarioService.getById(id);

      if (!usuario) {
        sendNotFound(res, 'Usuário não encontrado');
        return;
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = { ...usuario.toJSON(), password_hash: '[REDACTED]' } as Record<string, unknown>;
      
      // Registrar auditoria
      try {
        await registrarExclusao(
          req,
          'Usuario',
          usuario.id,
          dadosAnteriores
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      await UsuarioService.delete(id);

      sendSuccess(res, undefined, 'Usuário excluído com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao excluir usuário', 500, true);
    }
  }

  static async gerarWebhookSecret(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const usuario = await UsuarioService.getById(id);

      if (!usuario) {
        sendNotFound(res, 'Usuário não encontrado');
        return;
      }

      const novoSecret = randomBytes(32).toString('hex');
      await UsuarioService.update(id, { webhook_secret: novoSecret });

      logger.info('Webhook secret gerado para usuário', {
        usuario_id: usuario.id
      });

      sendSuccess(res, {
        webhook_secret: novoSecret
      }, 'Webhook secret gerado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao gerar webhook secret', 500, true, {
        usuario_id: req.params.id
      });
    }
  }
}

