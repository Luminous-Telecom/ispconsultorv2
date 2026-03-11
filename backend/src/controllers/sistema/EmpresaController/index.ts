import { Request, Response } from 'express';
import Joi from 'joi';
import { EmpresaService } from '../../../services/sistema/EmpresaService';
import { sendSuccess, sendError, sendNotFound, sendValidationError, sendForbidden } from '../../../utils/responseUtils';
import { AuthTokenPayload } from '../../../types/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload | string;
}

const isSuperAdmin = (req: Request): boolean => {
  const user = (req as AuthenticatedRequest).user;
  if (!user || typeof user === 'string') return false;
  return (user as AuthTokenPayload).role === 'superadmin';
};

const createSchema = Joi.object({
  razao_social: Joi.string().min(2).max(255).required().messages({
    'any.required': 'Razão social é obrigatória',
  }),
  nome_fantasia: Joi.string().max(255).allow('', null).optional(),
  cnpj: Joi.string().min(14).max(18).required().messages({
    'any.required': 'CNPJ é obrigatório',
  }),
  email: Joi.string().email().required().messages({
    'any.required': 'E-mail é obrigatório',
  }),
  telefone: Joi.string().allow('', null).optional(),
  celular: Joi.string().allow('', null).optional(),
  cep: Joi.string().min(8).max(9).required(),
  endereco: Joi.string().required(),
  numero: Joi.string().required(),
  complemento: Joi.string().allow('', null).optional(),
  bairro: Joi.string().required(),
  cidade: Joi.string().required(),
  estado: Joi.string().length(2).required(),
  responsavel_nome: Joi.string().required(),
  responsavel_cpf: Joi.string().min(11).max(14).allow('', null).optional(),
  responsavel_cargo: Joi.string().allow('', null).optional(),
});

const updateSchema = createSchema.fork(
  ['razao_social', 'cnpj', 'email', 'cep', 'endereco', 'numero', 'bairro', 'cidade', 'estado', 'responsavel_nome', 'responsavel_cpf'],
  (schema) => schema.optional()
);

export class EmpresaController {
  static async index(req: Request, res: Response): Promise<void> {
    try {
      if (!isSuperAdmin(req)) { sendForbidden(res, 'Acesso restrito a superadmin'); return; }
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      const search = req.query.search as string;
      const result = await EmpresaService.list({ page, limit, search });
      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar empresas', 500, true);
    }
  }

  static async show(req: Request, res: Response): Promise<void> {
    try {
      if (!isSuperAdmin(req)) { sendForbidden(res, 'Acesso restrito a superadmin'); return; }
      const empresa = await EmpresaService.getById(parseInt(req.params.id));
      if (!empresa) { sendNotFound(res, 'Empresa não encontrada'); return; }
      sendSuccess(res, empresa);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar empresa', 500, true);
    }
  }

  static async store(req: Request, res: Response): Promise<void> {
    try {
      if (!isSuperAdmin(req)) { sendForbidden(res, 'Acesso restrito a superadmin'); return; }
      const { error, value } = createSchema.validate(req.body, { abortEarly: false });
      if (error) {
        const errors = error.details.reduce<Record<string, string[]>>((acc, d) => {
          const field = d.path.join('.') || 'general';
          (acc[field] = acc[field] || []).push(d.message);
          return acc;
        }, {});
        sendValidationError(res, 'Dados inválidos', errors);
        return;
      }
      const cnpjExiste = await EmpresaService.existsByCnpj(value.cnpj);
      if (cnpjExiste) { sendValidationError(res, 'Já existe uma empresa com este CNPJ'); return; }
      const empresa = await EmpresaService.create(value);
      sendSuccess(res, empresa, 'Empresa criada com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar empresa', 500, true);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      if (!isSuperAdmin(req)) { sendForbidden(res, 'Acesso restrito a superadmin'); return; }
      const id = parseInt(req.params.id);
      const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
      if (error) {
        const errors = error.details.reduce<Record<string, string[]>>((acc, d) => {
          const field = d.path.join('.') || 'general';
          (acc[field] = acc[field] || []).push(d.message);
          return acc;
        }, {});
        sendValidationError(res, 'Dados inválidos', errors);
        return;
      }
      if (value.cnpj) {
        const cnpjExiste = await EmpresaService.existsByCnpj(value.cnpj, id);
        if (cnpjExiste) { sendValidationError(res, 'Já existe outra empresa com este CNPJ'); return; }
      }
      const empresa = await EmpresaService.update(id, value);
      sendSuccess(res, empresa, 'Empresa atualizada com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar empresa', 500, true);
    }
  }

  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      if (!isSuperAdmin(req)) { sendForbidden(res, 'Acesso restrito a superadmin'); return; }
      await EmpresaService.delete(parseInt(req.params.id));
      sendSuccess(res, undefined, 'Empresa excluída com sucesso');
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('usuário(s) vinculado(s)')) { sendForbidden(res, msg); return; }
      sendError(res, error, 'Erro ao excluir empresa', 500, true);
    }
  }
}
