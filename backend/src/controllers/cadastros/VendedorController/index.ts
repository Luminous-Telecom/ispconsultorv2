import { toPlain } from '../../../utils/toPlain';
import { Request, Response } from 'express';
import { VendedorService } from '../../../services/cadastros/VendedorService';
import { vendedorCreateSchema, vendedorUpdateSchema } from '../../../validators/vendedor.validator';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { sendSuccess, sendError, sendNotFound, sendValidationError, sendForbidden } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { parseListQuery, queryString } from '../../../utils/listQuery';

function joiErrors(error: { details: Array<{ path: Array<string | number>; message: string }> }) {
  const errors: Record<string, string[]> = {};
  error.details.forEach((detail) => {
    const path = detail.path.join('.');
    if (!errors[path]) errors[path] = [];
    errors[path].push(detail.message);
  });
  return errors;
}

function mesmaEmpresa(empresaId: number | null, registroEmpresaId: number | null) {
  return empresaId == null || registroEmpresaId == null || registroEmpresaId === empresaId;
}

export class VendedorController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, searchField, sortColumn, sortDirection } = parseListQuery(req.query);
      const result = await VendedorService.list({
        page,
        limit,
        search,
        searchField,
        sortColumn,
        sortDirection,
        ativo: queryString(req.query.ativo),
        empresa_id: getEmpresaIdOrNull(req),
      });
      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar vendedores', 500, true, { context: 'VendedorController', action: 'list' });
    }
  }

  static async findAtivos(req: Request, res: Response): Promise<void> {
    try {
      const result = await VendedorService.findAtivos(getEmpresaIdOrNull(req));
      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar vendedores ativos', 500, true);
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const item = await VendedorService.getById(req.params.id);
      if (!item || !mesmaEmpresa(getEmpresaIdOrNull(req), item.empresa_id)) {
        sendNotFound(res, 'Vendedor não encontrado');
        return;
      }
      sendSuccess(res, item);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar vendedor', 500, true);
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = vendedorCreateSchema.validate(req.body);
      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrors(error));
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      if (value.cpf_cnpj && await VendedorService.existsByCpfCnpj(value.cpf_cnpj, undefined, empresaId)) {
        sendForbidden(res, 'Já existe um vendedor cadastrado com este CPF/CNPJ');
        return;
      }

      const item = await VendedorService.create({ ...value, empresa_id: empresaId ?? null });
      try {
        await registrarCriacao(
          req,
          'Vendedor',
          item.id,
          toPlain(item) as Record<string, unknown>,
          undefined,
          getEmpresaIdOrNull(req) ?? item.empresa_id ?? null
        );
      } catch {
        // auditoria não interrompe o cadastro
      }
      sendSuccess(res, item, 'Vendedor criado com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar vendedor', 500, true, { context: 'VendedorController', action: 'create' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = vendedorUpdateSchema.validate(req.body);
      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrors(error));
        return;
      }

      const existing = await VendedorService.getById(req.params.id);
      if (!existing || !mesmaEmpresa(getEmpresaIdOrNull(req), existing.empresa_id)) {
        sendNotFound(res, 'Vendedor não encontrado');
        return;
      }

      if (value.cpf_cnpj && value.cpf_cnpj !== existing.cpf_cnpj) {
        const duplicado = await VendedorService.existsByCpfCnpj(value.cpf_cnpj, existing.id, existing.empresa_id);
        if (duplicado) {
          sendForbidden(res, 'Já existe um vendedor cadastrado com este CPF/CNPJ');
          return;
        }
      }

      const item = await VendedorService.update(existing.id, value);
      try {
        await registrarAtualizacao(
          req,
          'Vendedor',
          item.id,
          toPlain(existing) as Record<string, unknown>,
          toPlain(item) as Record<string, unknown>,
          undefined,
          getEmpresaIdOrNull(req) ?? item.empresa_id ?? null
        );
      } catch {
        // auditoria não interrompe a edição
      }
      sendSuccess(res, item, 'Vendedor atualizado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar vendedor', 500, true);
    }
  }

  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const existing = await VendedorService.getById(req.params.id);
      if (!existing || !mesmaEmpresa(getEmpresaIdOrNull(req), existing.empresa_id)) {
        sendNotFound(res, 'Vendedor não encontrado');
        return;
      }

      const dadosAnteriores = toPlain(existing) as Record<string, unknown>;
      await VendedorService.delete(existing.id);
      try {
        await registrarExclusao(
          req,
          'Vendedor',
          existing.id,
          dadosAnteriores,
          undefined,
          getEmpresaIdOrNull(req) ?? existing.empresa_id ?? null
        );
      } catch {
        // auditoria não interrompe a exclusão
      }
      sendSuccess(res, undefined, 'Vendedor excluído com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao excluir vendedor', 500, true);
    }
  }
}
