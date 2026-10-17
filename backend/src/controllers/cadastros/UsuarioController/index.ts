import { toPlain } from '../../../utils/toPlain';
import { Request, Response } from 'express';
import { UsuarioService } from '../../../services/cadastros/UsuarioService';
import * as Joi from 'joi';
import { randomBytes } from 'crypto';
import { logger } from '../../../utils/logger';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { buildPagination } from '../../../utils/pagination';
import { ativoFilterForService, parseListQuery } from '../../../utils/listQuery';
import { SaasPlanoLimitesService } from '../../../services/saas/SaasPlanoLimitesService';
function canAccessUsuario(usuario: { empresa_id: number | null }, empresaId: number | null): boolean {
  if (usuario.empresa_id === null) return true;
  if (empresaId === null) return true;
  return usuario.empresa_id === empresaId;
}

export class UsuarioController {
  private static createSchema = Joi.object({
    nome: Joi.string().min(3).max(150).required(),
    email: Joi.string().email().max(180).required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin').default('admin'),
    ativo: Joi.boolean().default(true)
  });

  private static updateSchema = Joi.object({
    nome: Joi.string().min(3).max(150),
    email: Joi.string().email().max(180),
    password: Joi.string().min(6),
    role: Joi.string().valid('admin'),
    ativo: Joi.boolean()
  });

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, searchField, ativo, sortColumn, sortDirection } = parseListQuery(
        req.query,
        { defaultLimit: 10 }
      );
      const empresaId = getEmpresaIdOrNull(req);

      if (empresaId === null || empresaId === undefined) {
        sendSuccess(res, { success: true, data: [], pagination: buildPagination(page, limit, 0) });
        return;
      }

      const result = await UsuarioService.list({
        page,
        limit,
        search: search ?? '',
        searchField,
        ativo: ativoFilterForService(ativo),
        sortColumn,
        sortDirection,
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
      const empresaId = getEmpresaIdOrNull(req);

      if (!usuario || !canAccessUsuario(usuario, empresaId)) {
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
      if (empresaId != null) {
        const limitError = await SaasPlanoLimitesService.validateUsuarioAtivoLimit(empresaId, {
          willBeActive: value.ativo !== false,
        });
        if (limitError) {
          sendValidationError(res, limitError);
          return;
        }
      }

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
        const empresaId = getEmpresaIdOrNull(req) ?? usuario.empresa_id ?? null;
        await registrarCriacao(
          req,
          'Usuario',
          usuario.id,
          { ...toPlain(usuario), password_hash: '[REDACTED]' } as Record<string, unknown>,
          undefined,
          empresaId
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
      const empresaId = getEmpresaIdOrNull(req);

      if (!usuario || !canAccessUsuario(usuario, empresaId)) {
        sendNotFound(res, 'Usuário não encontrado');
        return;
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = { ...toPlain(usuario), password_hash: '[REDACTED]' } as Record<string, unknown>;

      if (value.email && value.email !== usuario.email) {
        const emailExistente = await UsuarioService.existsByEmail(value.email, usuario.id);

        if (emailExistente) {
          sendValidationError(res, 'Email já cadastrado');
          return;
        }
      }
      if (value.ativo === true && usuario.ativo !== true && usuario.empresa_id != null) {
        const limitError = await SaasPlanoLimitesService.validateUsuarioAtivoLimit(usuario.empresa_id, {
          willBeActive: true,
          excludeUsuarioId: usuario.id,
        });
        if (limitError) {
          sendValidationError(res, limitError);
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
      const dadosNovos = { ...toPlain(usuarioAtualizado), password_hash: '[REDACTED]' } as Record<string, unknown>;
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      try {
        const empresaId = getEmpresaIdOrNull(req) ?? usuarioAtualizado.empresa_id ?? null;
        await registrarAtualizacao(
          req,
          'Usuario',
          usuario.id,
          dadosAnteriores,
          dadosNovos,
          undefined,
          empresaId
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
      const empresaId = getEmpresaIdOrNull(req);

      if (!usuario || !canAccessUsuario(usuario, empresaId)) {
        sendNotFound(res, 'Usuário não encontrado');
        return;
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = { ...toPlain(usuario), password_hash: '[REDACTED]' } as Record<string, unknown>;
      
      // Registrar auditoria
      try {
        const empresaId = getEmpresaIdOrNull(req) ?? usuario.empresa_id ?? null;
        await registrarExclusao(
          req,
          'Usuario',
          usuario.id,
          dadosAnteriores,
          undefined,
          empresaId
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
      const empresaId = getEmpresaIdOrNull(req);

      if (!usuario || !canAccessUsuario(usuario, empresaId)) {
        sendNotFound(res, 'Usuário não encontrado');
        return;
      }

      const dadosAnteriores = { ...toPlain(usuario), password_hash: '[REDACTED]', webhook_secret: '[REDACTED]' } as Record<string, unknown>;
      const novoSecret = randomBytes(32).toString('hex');
      const usuarioAtualizado = await UsuarioService.update(id, { webhook_secret: novoSecret });

      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? usuarioAtualizado.empresa_id ?? null;
        await registrarAtualizacao(
          req,
          'Usuario',
          usuario.id,
          dadosAnteriores,
          { ...toPlain(usuarioAtualizado), password_hash: '[REDACTED]', webhook_secret: '[REDACTED]' } as Record<string, unknown>,
          'Webhook secret regenerado',
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

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

