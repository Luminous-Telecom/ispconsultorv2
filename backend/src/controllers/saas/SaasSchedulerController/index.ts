import { Request, Response } from 'express';
import { SaasScheduledRoutineService } from '../../../services/saas/SaasScheduledRoutineService';
import { SchedulerService } from '../../../services/scheduler/SchedulerService';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService';
import { calculateNextExecution } from '../../../utils/SchedulerUtils';
import { sendSuccess, sendError, sendValidationError, sendNotFound } from '../../../utils/responseUtils';
import { saasRoutineBodyFromRequest, syntheticHoraExecucaoFromSaasBody } from '../../../utils/saasScheduledRoutineCronPayload';

const TIPOS_ALVO_SAAS = ['geracao_titulos', 'envio_boletos', 'remessa_bancaria', 'bloquear_saas_atraso'] as const;
const TIPOS_ALVO_ERP_GLOBAL = [
  'geracao_titulos',
  'envio_boletos',
  'remessa_bancaria',
  'verificar_vencimentos',
  'desbloquear_blockdomi',
  'backup_equipamentos_ssh',
  'rpki_sync_parent_resources',
  'rpki_sync_repositories',
  'outros'
] as const;

function proximaExecucaoDateParaSaasStore(routineData: Record<string, unknown>): Date {
  const p = routineData.proxima_execucao;
  if (p instanceof Date && !Number.isNaN(p.getTime())) {
    return p;
  }
  if (typeof p === 'string') {
    const d = new Date(p);
    if (!Number.isNaN(d.getTime())) {
      return d;
    }
  }
  return calculateNextExecution({
    hora_execucao: syntheticHoraExecucaoFromSaasBody(routineData),
    frequencia: 'personalizada'
  });
}

function mensagemValidacaoAlvoTipo(body: { tipo?: string; alvo?: string }): string | null {
  const alvo = body.alvo === 'erp_global' ? 'erp_global' : 'saas';
  const tipo = body.tipo;
  if (!tipo) return null;
  if (alvo === 'saas') {
    if (!(TIPOS_ALVO_SAAS as readonly string[]).includes(tipo)) {
      return 'No alvo Cobrança SaaS, use geração/envio/remessa do produto ou bloquear por atraso.';
    }
  } else if (!(TIPOS_ALVO_ERP_GLOBAL as readonly string[]).includes(tipo)) {
    return 'No alvo ERP (todos os clientes), use faturamento ERP, verificar vencimentos, desbloquear domínios ou rotinas RPKI.';
  }
  return null;
}

export class SaasSchedulerController {
  async index(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 15, search, searchField, sort = 'created_at', direction = 'desc' } = req.query;

      const result = await SaasScheduledRoutineService.list({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        searchField: typeof searchField === 'string' ? searchField : undefined,
        sort: sort as string,
        direction: direction as 'asc' | 'desc'
      });

      res.json(result);
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'SaasSchedulerController',
        action: 'index'
      });
    }
  }

  async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const routine = await SaasScheduledRoutineService.getById(Number(id));

      if (!routine) {
        sendNotFound(res, 'Rotina não encontrada');
        return;
      }

      sendSuccess(res, routine);
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'SaasSchedulerController',
        action: 'show',
        rotinaId: req.params.id
      });
    }
  }

  async store(req: Request, res: Response): Promise<void> {
    try {
      const routineData = saasRoutineBodyFromRequest(req.body);

      if (!routineData.nome || !routineData.tipo) {
        sendValidationError(res, 'Campos obrigatórios: nome, tipo');
        return;
      }

      const msgAlvo = mensagemValidacaoAlvoTipo(routineData);
      if (msgAlvo) {
        sendValidationError(res, msgAlvo);
        return;
      }

      const alvo: 'saas' | 'erp_global' =
        routineData.alvo === 'erp_global' ? 'erp_global' : 'saas';
      const dadosComProximaExecucao = {
        ...routineData,
        alvo,
        proxima_execucao: proximaExecucaoDateParaSaasStore(routineData)
      } as Parameters<typeof SaasScheduledRoutineService.create>[0];

      const routine = await SaasScheduledRoutineService.create(dadosComProximaExecucao);
      await registrarCriacao(req as any, 'SaasScheduledRoutine', routine.id, routine.toJSON ? routine.toJSON() as Record<string, unknown> : routine as unknown as Record<string, unknown>);
      if (routine.ativo) {
        await SchedulerService.getInstance().scheduleSaasRoutine(routine);
      }
      sendSuccess(res, routine, 'Rotina criada com sucesso', 201);
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'SaasSchedulerController',
        action: 'store',
        body: req.body
      });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = saasRoutineBodyFromRequest(req.body);

      const routineAntiga = await SaasScheduledRoutineService.getById(Number(id));
      const tipoParaValidacao =
        typeof updateData.tipo === 'string' ? updateData.tipo : routineAntiga?.tipo;
      const alvoParaValidacao =
        typeof updateData.alvo === 'string' ? updateData.alvo : routineAntiga?.alvo;
      const msgAlvo = mensagemValidacaoAlvoTipo({
        tipo: tipoParaValidacao,
        alvo: alvoParaValidacao
      });
      if (msgAlvo) {
        sendValidationError(res, msgAlvo);
        return;
      }
      if (updateData.alvo !== undefined) {
        (updateData as { alvo?: string }).alvo = updateData.alvo === 'erp_global' ? 'erp_global' : 'saas';
      }

      const routine = await SaasScheduledRoutineService.update(Number(id), updateData);
      if (routineAntiga && routine) {
        await registrarAtualizacao(req as any, 'SaasScheduledRoutine', Number(id),
          routineAntiga.toJSON ? routineAntiga.toJSON() as Record<string, unknown> : routineAntiga as unknown as Record<string, unknown>,
          routine.toJSON ? routine.toJSON() as Record<string, unknown> : routine as unknown as Record<string, unknown>);
      }
      const scheduler = SchedulerService.getInstance();
      if (routine.ativo) {
        await scheduler.scheduleSaasRoutine(routine);
      } else {
        scheduler.unscheduleSaasRoutine(Number(id));
      }
      sendSuccess(res, routine, 'Rotina atualizada com sucesso');
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'SaasSchedulerController',
        action: 'update',
        rotinaId: req.params.id,
        body: req.body
      });
    }
  }

  async execute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const routineId = Number(id);
      if (isNaN(routineId)) {
        sendValidationError(res, 'ID da rotina inválido');
        return;
      }
      const routine = await SaasScheduledRoutineService.getById(routineId);
      const payload = (req as { user?: { sub?: string; email?: string; nome?: string }; saasUser?: { sub?: string; email?: string; nome?: string } }).user
        ?? (req as { user?: { sub?: string; email?: string; nome?: string }; saasUser?: { sub?: string; email?: string; nome?: string } }).saasUser;
      const usuario = payload
        ? { id: parseInt(String(payload.sub ?? 0), 10), nome: payload.nome ?? null, email: payload.email ?? null }
        : undefined;
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || (req.headers['x-real-ip'] as string)
        || req.socket?.remoteAddress
        || null;
      await SchedulerService.getInstance().executeSaasRoutineManually(routineId, usuario, ipAddress);
      if (routine) {
        const dados = routine.toJSON ? routine.toJSON() as Record<string, unknown> : routine as unknown as Record<string, unknown>;
        await registrarAtualizacao(req as any, 'SaasScheduledRoutine', routineId, dados, dados, 'Execução manual da rotina', null);
      }
      sendSuccess(res, { message: 'Rotina iniciada em background' }, 'Rotina iniciada em background');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      if (msg === 'Rotina não encontrada') {
        sendNotFound(res, msg);
        return;
      }
      if (msg === 'Rotina está inativa') {
        sendValidationError(res, msg);
        return;
      }
      sendError(res, error, 'Erro ao executar rotina', 500, true, {
        context: 'SaasSchedulerController',
        action: 'execute',
        rotinaId: req.params.id
      });
    }
  }

  async destroy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const routineId = Number(id);
      const routineAntiga = await SaasScheduledRoutineService.getById(routineId);
      SchedulerService.getInstance().unscheduleSaasRoutine(routineId);
      await SaasScheduledRoutineService.delete(routineId);
      if (routineAntiga) {
        await registrarExclusao(req as any, 'SaasScheduledRoutine', routineId,
          routineAntiga.toJSON ? routineAntiga.toJSON() as Record<string, unknown> : routineAntiga as unknown as Record<string, unknown>);
      }
      sendSuccess(res, undefined, 'Rotina deletada com sucesso');
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'SaasSchedulerController',
        action: 'destroy',
        rotinaId: req.params.id
      });
    }
  }
}

export default SaasSchedulerController;
