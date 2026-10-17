import { toPlain } from '../../../utils/toPlain';
import { Request, Response } from 'express';
import { SchedulerService } from '../../../services/scheduler/SchedulerService';
import { ScheduledRoutineService } from '../../../services/scheduler/ScheduledRoutineService';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import { sendSuccess, sendError, sendValidationError, sendNotFound } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { getModulosDoPlano, tenantTemModulo } from '../../../services/saas/PlanoModulosService';
import { getClientIp } from '../../../utils/requestUtils';
import { parseSchedulerListQuery } from '../../../utils/listQuery';
import { buildPagination } from '../../../utils/pagination';

/** Boletos, títulos, remessa e backup SSH ficam no agendador SaaS. No ERP só rotinas por tenant (ex.: outros). */
const TIPOS_AGENDADOR_PERMITIDOS_NO_ERP = ['outros'] as const;

export class SchedulerController {
  private schedulerService: SchedulerService;

  constructor() {
    this.schedulerService = SchedulerService.getInstance();
  }

  // Listar todas as rotinas
  public async index(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, searchField, sortColumn, sortDirection } = parseSchedulerListQuery(
        req.query
      );
      const empresaId = getEmpresaIdOrNull(req);

      if (empresaId === null || empresaId === undefined) {
        sendSuccess(res, {
          success: true,
          data: [],
          pagination: {
            ...buildPagination(page, limit, 0),
            total: 0,
            page,
            limit,
            pages: 0,
          },
        });
        return;
      }

      const result = await ScheduledRoutineService.list({
        page,
        limit,
        search,
        searchField,
        sort: sortColumn ?? 'created_at',
        direction: sortDirection ?? 'desc',
        empresa_id: empresaId ?? undefined,
      });
      res.json(result);
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'SchedulerController',
        action: 'index'
      });
    }
  }

  // Obter rotina por ID
  public async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      if (empresaId === null || empresaId === undefined) {
        sendNotFound(res, 'Rotina não encontrada');
        return;
      }
      const routine = await ScheduledRoutineService.getById(Number(id), empresaId);

      if (!routine) {
        sendNotFound(res, 'Rotina não encontrada');
        return;
      }

      sendSuccess(res, routine);
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'SchedulerController',
        action: 'show',
        rotinaId: req.params.id
      });
    }
  }

  // Criar nova rotina
  public async store(req: Request, res: Response): Promise<void> {
    try {
      const routineData = req.body;

      // Validações básicas
      if (!routineData.nome || !routineData.tipo || !routineData.frequencia || !routineData.hora_execucao) {
        sendValidationError(res, 'Campos obrigatórios: nome, tipo, frequencia, hora_execucao');
        return;
      }

      if (!TIPOS_AGENDADOR_PERMITIDOS_NO_ERP.includes(routineData.tipo)) {
        sendValidationError(
          res,
          'Rotinas globais (boletos, títulos, remessa, backup SSH, etc.) são configuradas no painel SaaS — Agendador, com alvo "ERP (todos os clientes)".'
        );
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      if (routineData.tipo === 'desbloquear_blockdomi') {
        if (empresaId != null) {
          const modulos = await getModulosDoPlano(empresaId);
          if (!tenantTemModulo(modulos, 'blockdomi')) {
            sendValidationError(res, 'Módulo blockdomi não está ativo no plano. A rotina de desbloquear domínios só pode ser criada quando o módulo está habilitado.');
            return;
          }
        }
      }

      const dadosComEmpresa = { ...routineData, empresa_id: empresaId ?? routineData.empresa_id };
      const routine = await this.schedulerService.createRoutine(dadosComEmpresa);

      // Registrar auditoria
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? (routine as { empresa_id?: number | null }).empresa_id ?? null;
        await registrarCriacao(
          req,
          'ScheduledRoutine',
          routine.id,
          toPlain(routine) as Record<string, unknown>,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, routine, 'Rotina criada com sucesso', 201);
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'SchedulerController',
        action: 'create',
        body: req.body
      });
    }
  }

  // Atualizar rotina
  public async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const empresaId = getEmpresaIdOrNull(req);

      if (empresaId === null || empresaId === undefined) {
        sendNotFound(res, 'Rotina não encontrada');
        return;
      }

      if (updateData.tipo === 'desbloquear_blockdomi') {
        if (empresaId != null) {
          const modulos = await getModulosDoPlano(empresaId);
          if (!tenantTemModulo(modulos, 'blockdomi')) {
            sendValidationError(res, 'Módulo blockdomi não está ativo no plano. A rotina de desbloquear domínios só pode ser usada quando o módulo está habilitado.');
            return;
          }
        }
      }

      // Buscar rotina antes de atualizar para capturar dados anteriores
      const routineBefore = await ScheduledRoutineService.getById(Number(id), empresaId ?? undefined);
      if (!routineBefore) {
        sendNotFound(res, 'Rotina não encontrada');
        return;
      }
      const dadosAnteriores = toPlain(routineBefore) as Record<string, unknown>;

      const routine = await this.schedulerService.updateRoutine(Number(id), updateData);
      
      // Recarregar rotina para obter dados atualizados
      const routineAtualizada = await ScheduledRoutineService.getById(Number(id), empresaId ?? undefined);
      if (!routineAtualizada) {
        sendNotFound(res, 'Rotina não encontrada após atualização');
        return;
      }

      // Registrar auditoria
      const dadosNovos = toPlain(routineAtualizada) as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? (routineAtualizada as { empresa_id?: number | null }).empresa_id ?? null;
        await registrarAtualizacao(
          req,
          'ScheduledRoutine',
          Number(id),
          dadosAnteriores,
          dadosNovos,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, routineAtualizada, 'Rotina atualizada com sucesso');
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'SchedulerController',
        action: 'update',
        rotinaId: req.params.id,
        body: req.body
      });
    }
  }

  // Deletar rotina
  public async destroy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);

      if (empresaId === null || empresaId === undefined) {
        sendNotFound(res, 'Rotina não encontrada');
        return;
      }

      // Buscar rotina antes de deletar para capturar dados anteriores
      const routine = await ScheduledRoutineService.getById(Number(id), empresaId);
      if (!routine) {
        sendNotFound(res, 'Rotina não encontrada');
        return;
      }

      const dadosAnteriores = toPlain(routine) as Record<string, unknown>;
      setAuditData(req, dadosAnteriores);
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? (routine as { empresa_id?: number | null }).empresa_id ?? null;
        await registrarExclusao(
          req,
          'ScheduledRoutine',
          Number(id),
          dadosAnteriores,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      await this.schedulerService.deleteRoutine(Number(id));

      sendSuccess(res, undefined, 'Rotina deletada com sucesso');
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'SchedulerController',
        action: 'delete',
        rotinaId: req.params.id
      });
    }
  }

  // Ativar/Desativar rotina
  public async toggle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { ativo } = req.body;
      const empresaId = getEmpresaIdOrNull(req);

      if (empresaId === null || empresaId === undefined) {
        sendNotFound(res, 'Rotina não encontrada');
        return;
      }

      if (typeof ativo !== 'boolean') {
        sendValidationError(res, 'Campo "ativo" deve ser um booleano');
        return;
      }

      // Buscar rotina antes de atualizar para capturar dados anteriores
      const routineBefore = await ScheduledRoutineService.getById(Number(id), empresaId ?? undefined);
      const dadosAnteriores = routineBefore ? (toPlain(routineBefore) as Record<string, unknown>) : {};

      await this.schedulerService.toggleRoutine(Number(id), ativo);
      
      // Recarregar rotina para obter dados atualizados
      const routineAtualizada = await ScheduledRoutineService.getById(Number(id), empresaId ?? undefined);
      if (!routineAtualizada) {
        sendNotFound(res, 'Rotina não encontrada após atualização');
        return;
      }

      // Registrar auditoria
      const dadosNovos = toPlain(routineAtualizada) as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? (routineAtualizada as { empresa_id?: number | null }).empresa_id ?? null;
        await registrarAtualizacao(
          req,
          'ScheduledRoutine',
          Number(id),
          dadosAnteriores,
          dadosNovos,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, routineAtualizada, `Rotina ${ativo ? 'ativada' : 'desativada'} com sucesso`);
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'SchedulerController',
        action: 'toggleStatus',
        rotinaId: req.params.id,
        body: req.body
      });
    }
  }

  // Executar rotina manualmente
  public async execute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      if (empresaId === null || empresaId === undefined) {
        sendNotFound(res, 'Rotina não encontrada');
        return;
      }
      const routine = await ScheduledRoutineService.getById(Number(id), empresaId);
      if (!routine) {
        sendNotFound(res, 'Rotina não encontrada');
        return;
      }

      const payload = (req as { user?: { sub?: string; email?: string; nome?: string }; saasUser?: { sub?: string; email?: string; nome?: string } }).user
        ?? (req as { user?: { sub?: string; email?: string; nome?: string }; saasUser?: { sub?: string; email?: string; nome?: string } }).saasUser;
      const usuario = payload
        ? { id: parseInt(String(payload.sub ?? 0), 10), nome: payload.nome ?? null, email: payload.email ?? null }
        : undefined;
      const ipAddress = getClientIp(req);

      const resultado = await this.schedulerService.executeRoutineManually(Number(id), usuario, ipAddress);

      sendSuccess(res, resultado, 'Rotina iniciada em background');
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'SchedulerController',
        action: 'execute',
        rotinaId: req.params.id
      });
    }
  }

  // Status do scheduler
  public async status(req: Request, res: Response): Promise<void> {
    try {
      const status = await this.schedulerService.getStatus();

      sendSuccess(res, status);
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'SchedulerController',
        action: 'getStatus'
      });
    }
  }

  // Obter logs de execução de uma rotina específica
  public async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const routineId = Number(id);
      
      if (isNaN(routineId)) {
        sendValidationError(res, 'ID da rotina inválido');
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      if (empresaId == null) {
        sendNotFound(res, 'Rotina não encontrada');
        return;
      }
      const routine = await ScheduledRoutineService.getById(routineId, empresaId);
      if (!routine) {
        sendNotFound(res, 'Rotina não encontrada');
        return;
      }

      const logs = await this.schedulerService.getExecutionLogs(routineId);

      sendSuccess(res, logs);
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'SchedulerController',
        action: 'getLogsByRoutine',
        rotinaId: req.params.id,
        query: req.query
      });
    }
  }

  // Obter todos os logs de execução
  public async getAllLogs(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      if (empresaId == null) {
        sendSuccess(res, []);
        return;
      }

      const { data: routines } = await ScheduledRoutineService.list({
        page: 1,
        limit: 500,
        empresa_id: empresaId,
      });
      const allowed = new Set(routines.map((r) => Number(r.id)));
      const logs = (await this.schedulerService.getRecentExecutionLogs(50)).filter((log) =>
        allowed.has(Number(log.routine_id))
      );

      sendSuccess(res, logs);
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'SchedulerController',
        action: 'getAllLogs',
        query: req.query
      });
    }
  }
}

export default SchedulerController;