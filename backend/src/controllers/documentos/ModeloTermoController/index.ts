import { toPlain } from '../../../utils/toPlain';
import { Request, Response } from 'express';
import { ModeloDocumentoService } from '../../../services/documentos/ModeloDocumentoService';
import { ModeloDocumentoController } from '../ModeloDocumentoController';
import { ContratoService } from '../../../services/contratos/ContratoService';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { sendSuccess, sendError, sendNotFound, sendForbidden } from '../../../utils/responseUtils';
import type { AuthenticatedRequest } from '../../../types/auth';

/**
 * Verifica se o termo pertence à empresa do usuário (ou é global)
 */
function pertenceEmpresa(
  doc: { empresa_id?: number | null },
  empresaId: number | null
): boolean {
  const eid = doc.empresa_id;
  if (empresaId == null) return true;
  return eid === empresaId || eid === null;
}

/**
 * Controller para /api/modelos-termo.
 * Proxy para ModeloDocumento com tipo='termo' (retrocompatibilidade com frontend).
 */
export class ModeloTermoController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const result = await ModeloDocumentoService.list({
        tipo: 'termo',
        ...(typeof empresaId === 'number' && { empresa_id: empresaId }),
      });
      const data = result.data.map((d) => {
        const j = toPlain(d) as unknown as Record<string, unknown>;
        return { ...j, tipo_termo: (j.tipo as string) || 'adesao' };
      });
      sendSuccess(res, data, 'Modelos de termo listados');
    } catch (error) {
      sendError(res, error, 'Erro ao listar modelos de termo', 500, true);
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const doc = await ModeloDocumentoService.getById(id);
      if (!doc || doc.tipo !== 'termo') {
        sendNotFound(res, 'Modelo de termo não encontrado');
        return;
      }
      if (!pertenceEmpresa(doc, empresaId)) {
        sendNotFound(res, 'Modelo de termo não encontrado');
        return;
      }
      const j = toPlain(doc) as unknown as Record<string, unknown>;
      sendSuccess(res, { ...j, tipo_termo: (j.tipo as string) || 'adesao' }, 'Modelo de termo encontrado');
    } catch (error) {
      sendError(res, error, 'Erro ao buscar modelo de termo', 500, true);
    }
  }

  static async getByTipo(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const result = await ModeloDocumentoService.list({
        tipo: 'termo',
        ...(typeof empresaId === 'number' && { empresa_id: empresaId }),
      });
      const data = result.data.map((d) => {
        const j = toPlain(d) as unknown as Record<string, unknown>;
        return { ...j, tipo_termo: (j.tipo as string) || 'adesao' };
      });
      sendSuccess(res, data, 'Modelos de termo listados');
    } catch (error) {
      sendError(res, error, 'Erro ao listar modelos de termo', 500, true);
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body;
      const empresaId = getEmpresaIdOrNull(req);

      const doc = await ModeloDocumentoService.create({
        nome: body.nome,
        descricao: body.descricao ?? null,
        tipo: 'termo',
        conteudo: body.conteudo ?? '',
        ativo: body.ativo !== false,
        empresa_id: empresaId ?? null,
        tamanho_maximo: 10485760,
        tipos_permitidos: 'pdf,doc,docx,xls,xlsx',
        retencao_dias: 365,
        auto_backup: false,
        criptografia: false,
      });
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? doc.empresa_id ?? null;
        await registrarCriacao(
          req as AuthenticatedRequest,
          'ModeloTermo',
          doc.id,
          toPlain(doc) as unknown as Record<string, unknown>,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      const j = toPlain(doc) as unknown as Record<string, unknown>;
      sendSuccess(res, { ...j, tipo_termo: 'adesao' }, 'Modelo de termo criado', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar modelo de termo', 500, true);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const body = req.body;
      const empresaId = getEmpresaIdOrNull(req);
      const doc = await ModeloDocumentoService.getById(id);
      if (!doc || doc.tipo !== 'termo') {
        sendNotFound(res, 'Modelo de termo não encontrado');
        return;
      }
      if (!pertenceEmpresa(doc, empresaId)) {
        sendNotFound(res, 'Modelo de termo não encontrado');
        return;
      }
      const dadosAnteriores = toPlain(doc) as unknown as Record<string, unknown>;
      const updated = await ModeloDocumentoService.update(id, {
        nome: body.nome,
        descricao: body.descricao,
        conteudo: body.conteudo,
        ativo: body.ativo,
      });
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? updated.empresa_id ?? null;
        await registrarAtualizacao(
          req as AuthenticatedRequest,
          'ModeloTermo',
          updated.id,
          dadosAnteriores,
          toPlain(updated) as unknown as Record<string, unknown>,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      const j = toPlain(updated) as unknown as Record<string, unknown>;
      sendSuccess(res, { ...j, tipo_termo: (j.tipo as string) || 'adesao' }, 'Modelo de termo atualizado');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar modelo de termo', 500, true);
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const doc = await ModeloDocumentoService.getById(id);
      if (!doc || doc.tipo !== 'termo') {
        sendNotFound(res, 'Modelo de termo não encontrado');
        return;
      }
      if (!pertenceEmpresa(doc, empresaId)) {
        sendNotFound(res, 'Modelo de termo não encontrado');
        return;
      }
      const dadosAnteriores = toPlain(doc) as unknown as Record<string, unknown>;
      await ModeloDocumentoService.delete(id);
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? doc.empresa_id ?? null;
        await registrarExclusao(
          req as AuthenticatedRequest,
          'ModeloTermo',
          doc.id,
          dadosAnteriores,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      sendSuccess(res, undefined, 'Modelo de termo excluído');
    } catch (error) {
      sendError(res, error, 'Erro ao excluir modelo de termo', 500, true);
    }
  }

  static async generatePdf(req: Request, res: Response): Promise<void> {
    const empresaId = getEmpresaIdOrNull(req);
    const doc = await ModeloDocumentoService.getById(req.params.id);
    if (!doc || doc.tipo !== 'termo') {
      sendNotFound(res, 'Modelo de termo não encontrado');
      return;
    }
    if (!pertenceEmpresa(doc, empresaId)) {
      sendNotFound(res, 'Modelo de termo não encontrado');
      return;
    }
    return ModeloDocumentoController.generatePdf(req, res);
  }

  static async generateTestPdf(req: Request, res: Response): Promise<void> {
    const empresaId = getEmpresaIdOrNull(req);
    const doc = await ModeloDocumentoService.getById(req.params.id);
    if (!doc || doc.tipo !== 'termo') {
      sendNotFound(res, 'Modelo de termo não encontrado');
      return;
    }
    if (!pertenceEmpresa(doc, empresaId)) {
      sendNotFound(res, 'Modelo de termo não encontrado');
      return;
    }
    if (req.body?.clienteId && !req.query.cliente_id) {
      req.query.cliente_id = String(req.body.clienteId);
    }
    return ModeloDocumentoController.generateTestPdf(req, res);
  }

  static async generatePdfWithContrato(req: Request, res: Response): Promise<void> {
    const empresaId = getEmpresaIdOrNull(req);
    const doc = await ModeloDocumentoService.getById(req.params.id);
    if (!doc || doc.tipo !== 'termo') {
      sendNotFound(res, 'Modelo de termo não encontrado');
      return;
    }
    if (!pertenceEmpresa(doc, empresaId)) {
      sendNotFound(res, 'Modelo de termo não encontrado');
      return;
    }
    const contrato = await ContratoService.getById(req.params.contratoId);
    if (!contrato) {
      sendNotFound(res, 'Contrato não encontrado');
      return;
    }
    req.query.cliente_id = String(contrato.cliente_id);
    req.query.contrato_id = req.params.contratoId;
    return ModeloDocumentoController.generateTestPdf(req, res);
  }
}
