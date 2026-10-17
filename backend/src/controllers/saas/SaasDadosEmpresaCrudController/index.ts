import { toPlain } from '../../../utils/toPlain';
import { Request, Response } from 'express';
import Joi from 'joi';
import { SaasDadosEmpresaCrudService } from '../../../services/saas/SaasDadosEmpresaCrudService';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import type { SaasAuthenticatedRequest } from '../../../middleware/saasAuthMiddleware';
import { parseListQuery } from '../../../utils/listQuery';
import { joiErrorsToFieldMap } from '../../../utils/validationUtils';

const createSchema = Joi.object({
  nome_empresa: Joi.string().max(200).optional(),
  razao_social: Joi.string().max(255).optional().allow('', null),
  nome_fantasia: Joi.string().max(255).optional().allow('', null),
  cnpj: Joi.string().max(20).optional().allow('', null),
  inscricao_estadual: Joi.string().max(100).optional().allow('', null),
  inscricao_municipal: Joi.string().max(100).optional().allow('', null),
  cep: Joi.string().max(9).optional().allow('', null),
  endereco: Joi.string().max(255).optional().allow('', null),
  numero: Joi.string().max(20).optional().allow('', null),
  complemento: Joi.string().max(100).optional().allow('', null),
  bairro: Joi.string().max(100).optional().allow('', null),
  cidade: Joi.string().max(100).optional().allow('', null),
  estado: Joi.string().max(2).optional().allow('', null),
  telefone: Joi.string().max(30).optional().allow('', null),
  celular: Joi.string().max(20).optional().allow('', null),
  email: Joi.string().email().required(),
  site: Joi.string().max(255).optional().allow('', null),
  responsavel_nome: Joi.string().max(200).optional().allow('', null),
  responsavel_cpf: Joi.string().max(14).optional().allow('', null),
  responsavel_cargo: Joi.string().max(100).optional().allow('', null),
  responsavel_assinatura: Joi.string().optional().allow('', null),
  logo: Joi.string().optional().allow('', null),
  plano_id: Joi.number().optional().allow(null),
  status: Joi.string().valid('ativo', 'inativo', 'suspenso', 'cancelado', 'trial').optional(),
  limite_usuarios: Joi.number().integer().min(1).optional(),
  logo_url: Joi.string().max(500).optional().allow('', null),
  dominio_customizado: Joi.string().max(255).optional().allow('', null),
  observacoes: Joi.string().optional().allow('', null),
});

const updateSchema = createSchema.fork(['email'], (s) => s.optional());

export class SaasDadosEmpresaCrudController {
  static async list(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const { page, limit, search, sortColumn, sortDirection } = parseListQuery(req.query, {
        defaultLimit: 20,
      });
      const result = await SaasDadosEmpresaCrudService.list({
        page,
        limit,
        search,
        sortColumn,
        sortDirection,
      });
      sendSuccess(res, result);
    } catch (err) {
      sendError(res, err, 'Erro ao listar empresas SaaS', 500, true);
    }
  }

  static async getById(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const empresa = await SaasDadosEmpresaCrudService.getById(Number(req.params.id));
      if (!empresa) {
        sendNotFound(res, 'Empresa não encontrada');
        return;
      }
      sendSuccess(res, empresa);
    } catch (err) {
      sendError(res, err, 'Erro ao buscar empresa', 500, true);
    }
  }

  static async create(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const { error, value } = createSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }
      const empresa = await SaasDadosEmpresaCrudService.create(value);
      await registrarCriacao(req as any, 'SaasDadosEmpresaCrud', empresa.id, toPlain(empresa) as Record<string, unknown>, undefined, null);
      res.status(201).json({ success: true, message: 'Empresa criada com sucesso', data: empresa });
    } catch (err) {
      sendError(res, err, 'Erro ao criar empresa', 500, true);
    }
  }

  static async update(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const { error, value } = updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }
      const empresaAntiga = await SaasDadosEmpresaCrudService.getById(Number(req.params.id));
      await SaasDadosEmpresaCrudService.update(Number(req.params.id), value);
      if (empresaAntiga) {
        await registrarAtualizacao(req as any, 'SaasDadosEmpresaCrud', Number(req.params.id),
          toPlain(empresaAntiga) as Record<string, unknown>,
          { ...toPlain(empresaAntiga), ...value } as Record<string, unknown>,
          undefined, null);
      }
      sendSuccess(res, null, 'Empresa atualizada com sucesso');
    } catch (err) {
      sendError(res, err, 'Erro ao atualizar empresa', 500, true);
    }
  }

  static async delete(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const empresaAntiga = await SaasDadosEmpresaCrudService.getById(Number(req.params.id));
      await SaasDadosEmpresaCrudService.delete(Number(req.params.id));
      if (empresaAntiga) {
        await registrarExclusao(req as any, 'SaasDadosEmpresaCrud', Number(req.params.id), toPlain(empresaAntiga) as Record<string, unknown>, undefined, null);
      }
      sendSuccess(res, null, 'Empresa removida');
    } catch (err) {
      sendError(res, err, 'Erro ao remover empresa', 500, true);
    }
  }

  static async uploadLogo(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) return sendValidationError(res, 'Arquivo não enviado');
      const empresaAntiga = await SaasDadosEmpresaCrudService.getById(id);
      const relPath = `/arquivos/saas-empresa/${id}/logo.png`;
      await SaasDadosEmpresaCrudService.update(id, { logo: relPath, logo_url: relPath });
      if (empresaAntiga) {
        const dadosAnteriores = toPlain(empresaAntiga) as Record<string, unknown>;
        const dadosNovos = { ...dadosAnteriores, logo: relPath, logo_url: relPath };
        await registrarAtualizacao(req as any, 'SaasDadosEmpresaCrud', id, dadosAnteriores, dadosNovos, 'Upload de logo', null);
      }
      sendSuccess(res, { logo: relPath });
    } catch (err) {
      sendError(res, err, 'Erro ao enviar logo', 500, true);
    }
  }

  static async uploadAssinatura(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) return sendValidationError(res, 'Arquivo não enviado');
      const empresaAntiga = await SaasDadosEmpresaCrudService.getById(id);
      const relPath = `/arquivos/saas-empresa/${id}/assinatura.png`;
      await SaasDadosEmpresaCrudService.update(id, { responsavel_assinatura: relPath });
      if (empresaAntiga) {
        const dadosAnteriores = toPlain(empresaAntiga) as Record<string, unknown>;
        const dadosNovos = { ...dadosAnteriores, responsavel_assinatura: relPath };
        await registrarAtualizacao(req as any, 'SaasDadosEmpresaCrud', id, dadosAnteriores, dadosNovos, 'Upload de assinatura', null);
      }
      sendSuccess(res, { responsavel_assinatura: relPath });
    } catch (err) {
      sendError(res, err, 'Erro ao enviar assinatura', 500, true);
    }
  }
}
