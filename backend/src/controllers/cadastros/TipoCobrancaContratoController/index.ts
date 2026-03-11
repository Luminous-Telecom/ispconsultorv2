import { Request, Response } from 'express';
import { TipoCobrancaContratoService } from '../../../services/cadastros/TipoCobrancaContratoService';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

export class TipoCobrancaContratoController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { search, ativo, page, limit, sortColumn, sortDirection } = req.query;
      const empresaId = getEmpresaIdOrNull(req);
      const result = await TipoCobrancaContratoService.list({
        search: search as string | undefined,
        ativo: ativo as string | undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 15,
        sortColumn: sortColumn as string | undefined,
        sortDirection: sortDirection as string | undefined,
        empresa_id: empresaId
      });
      sendSuccess(res, result);
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao listar tipos de cobrança', 500, true);
    }
  }

  static async findAtivos(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const result = await TipoCobrancaContratoService.findAtivos(empresaId);
      sendSuccess(res, result);
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao buscar tipos de cobrança ativos', 500, true);
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const item = await TipoCobrancaContratoService.getById(id);
      if (!item) {
        sendNotFound(res, 'Tipo de cobrança não encontrado');
        return;
      }
      sendSuccess(res, item);
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao buscar tipo de cobrança', 500, true);
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { nome, quantidade_titulos, periodicidade, ativo } = req.body;
      if (!nome || !quantidade_titulos) {
        sendValidationError(res, 'Nome e quantidade de títulos são obrigatórios');
        return;
      }
      const empresaId = getEmpresaIdOrNull(req);
      const item = await TipoCobrancaContratoService.create({
        empresa_id: empresaId ?? null,
        nome,
        quantidade_titulos: Number(quantidade_titulos),
        periodicidade: periodicidade || 'mensal',
        ativo: ativo !== false
      });
      try {
        await registrarCriacao(req, 'TipoCobrancaContrato', item.id, item.toJSON() as Record<string, unknown>);
      } catch {
        // não interromper
      }
      sendSuccess(res, item, 'Tipo de cobrança criado com sucesso!', 201);
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao criar tipo de cobrança', 500, true);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { nome, quantidade_titulos, periodicidade, ativo } = req.body;
      const existing = await TipoCobrancaContratoService.getById(id);
      if (!existing) {
        sendNotFound(res, 'Tipo de cobrança não encontrado');
        return;
      }
      const dados: Record<string, unknown> = {};
      if (nome !== undefined) dados.nome = nome;
      if (quantidade_titulos !== undefined) dados.quantidade_titulos = Number(quantidade_titulos);
      if (periodicidade !== undefined) dados.periodicidade = periodicidade;
      if (ativo !== undefined) dados.ativo = ativo;
      const item = await TipoCobrancaContratoService.update(id, dados);
      try {
        await registrarAtualizacao(
          req,
          'TipoCobrancaContrato',
          item.id,
          existing.toJSON() as Record<string, unknown>,
          item.toJSON() as Record<string, unknown>
        );
      } catch {
        // não interromper
      }
      sendSuccess(res, item, 'Tipo de cobrança atualizado com sucesso!');
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao atualizar tipo de cobrança', 500, true);
    }
  }

  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const existing = await TipoCobrancaContratoService.getById(id);
      if (!existing) {
        sendNotFound(res, 'Tipo de cobrança não encontrado');
        return;
      }
      const dadosAnteriores = existing.toJSON() as Record<string, unknown>;
      await TipoCobrancaContratoService.delete(id);
      try {
        await registrarExclusao(req, 'TipoCobrancaContrato', existing.id, dadosAnteriores);
      } catch {
        // não interromper
      }
      sendSuccess(res, undefined, 'Tipo de cobrança excluído com sucesso!');
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao excluir tipo de cobrança', 500, true);
    }
  }
}
