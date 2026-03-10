import { Response } from 'express';
import Joi from 'joi';
import { UsuarioService } from '../../../services/cadastros/UsuarioService';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import type { SaasAuthenticatedRequest } from '../../../middleware/saasAuthMiddleware';

const createSchema = Joi.object({
  empresa_id: Joi.number().integer().required(),
  nome: Joi.string().min(3).max(150).required(),
  email: Joi.string().email().max(180).required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'user').default('admin'),
  ativo: Joi.boolean().default(true),
});

const updateSchema = Joi.object({
  nome: Joi.string().min(3).max(150),
  email: Joi.string().email().max(180),
  password: Joi.string().min(6),
  role: Joi.string().valid('admin', 'user'),
  ativo: Joi.boolean(),
});

export class SaasTenantUsuarioController {
  static async list(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { page, limit, search, ativo, sortColumn, sortDirection, empresa_id } = req.query as Record<string, string>;
      const empresaId = empresa_id ? parseInt(empresa_id, 10) : undefined;
      if (!empresaId || isNaN(empresaId)) {
        sendValidationError(res, 'empresa_id é obrigatório na listagem');
        return;
      }
      const result = await UsuarioService.list({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 500,
        search: search || '',
        ativo,
        sortColumn,
        sortDirection: sortDirection as 'asc' | 'desc' | undefined,
        empresa_id: empresaId,
      });
      sendSuccess(res, result);
    } catch (err) {
      sendError(res, err, 'Erro ao listar usuários do tenant', 500, true);
    }
  }

  static async getById(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const usuario = await UsuarioService.getById(Number(req.params.id));
      if (!usuario) {
        sendNotFound(res, 'Usuário não encontrado');
        return;
      }
      sendSuccess(res, usuario);
    } catch (err) {
      sendError(res, err, 'Erro ao buscar usuário', 500, true);
    }
  }

  static async create(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { error, value } = createSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        const errs = error.details.reduce<Record<string, string[]>>((acc, d) => {
          const f = d.path.join('.') || 'general';
          (acc[f] = acc[f] || []).push(d.message);
          return acc;
        }, {});
        sendValidationError(res, 'Dados inválidos', errs);
        return;
      }
      const existente = await UsuarioService.existsByEmail(value.email);
      if (existente) {
        sendValidationError(res, 'Email já cadastrado');
        return;
      }
      const usuario = await UsuarioService.create({
        nome: value.nome,
        email: value.email,
        password: value.password,
        role: value.role || 'admin',
        ativo: value.ativo !== undefined ? value.ativo : true,
        empresa_id: value.empresa_id,
      });
      try {
        await registrarCriacao(
          req as unknown as import('express').Request,
          'Usuario',
          usuario.id,
          { ...usuario.toJSON(), password_hash: '[REDACTED]' } as Record<string, unknown>
        );
      } catch {
        /* não interromper */
      }
      res.status(201).json({ success: true, message: 'Usuário criado com sucesso', data: usuario });
    } catch (err) {
      sendError(res, err, 'Erro ao criar usuário', 500, true);
    }
  }

  static async update(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const { error, value } = updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        const errs = error.details.reduce<Record<string, string[]>>((acc, d) => {
          const f = d.path.join('.') || 'general';
          (acc[f] = acc[f] || []).push(d.message);
          return acc;
        }, {});
        sendValidationError(res, 'Dados inválidos', errs);
        return;
      }
      const usuario = await UsuarioService.getById(id);
      if (!usuario) {
        sendNotFound(res, 'Usuário não encontrado');
        return;
      }
      if (value.email && value.email !== usuario.email) {
        const existente = await UsuarioService.existsByEmail(value.email, usuario.id);
        if (existente) {
          sendValidationError(res, 'Email já cadastrado');
          return;
        }
      }
      const dadosAnteriores = { ...usuario.toJSON(), password_hash: '[REDACTED]' } as Record<string, unknown>;
      await UsuarioService.update(id, {
        nome: value.nome,
        email: value.email,
        password: value.password,
        role: value.role,
        ativo: value.ativo,
      });
      const usuarioAtualizado = await UsuarioService.getById(id);
      const dadosNovos = usuarioAtualizado ? { ...usuarioAtualizado.toJSON(), password_hash: '[REDACTED]' } as Record<string, unknown> : dadosAnteriores;
      try {
        await registrarAtualizacao(
          req as unknown as import('express').Request,
          'Usuario',
          id,
          dadosAnteriores,
          dadosNovos
        );
      } catch {
        /* não interromper */
      }
      sendSuccess(res, usuarioAtualizado, 'Usuário atualizado com sucesso');
    } catch (err) {
      sendError(res, err, 'Erro ao atualizar usuário', 500, true);
    }
  }

  static async delete(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const usuario = await UsuarioService.getById(id);
      if (!usuario) {
        sendNotFound(res, 'Usuário não encontrado');
        return;
      }
      const dadosAnteriores = { ...usuario.toJSON(), password_hash: '[REDACTED]' } as Record<string, unknown>;
      try {
        await registrarExclusao(
          req as unknown as import('express').Request,
          'Usuario',
          id,
          dadosAnteriores
        );
      } catch {
        /* não interromper */
      }
      await UsuarioService.delete(id);
      sendSuccess(res, undefined, 'Usuário excluído com sucesso');
    } catch (err) {
      sendError(res, err, 'Erro ao excluir usuário', 500, true);
    }
  }
}
