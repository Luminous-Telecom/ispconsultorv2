import { Request, Response } from 'express';
import { SaasScheduledRoutineService } from '../../../services/saas/SaasScheduledRoutineService';
import { SchedulerService } from '../../../services/scheduler/SchedulerService';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService';
import { calculateNextExecution } from '../../../utils/SchedulerUtils';
import { sendSuccess, sendError, sendValidationError, sendNotFound } from '../../../utils/responseUtils';

export class SaasSchedulerController {
  async index(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 15, search, sort = 'created_at', direction = 'desc' } = req.query;

      const result = await SaasScheduledRoutineService.list({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
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
      const routineData = req.body;

      if (!routineData.nome || !routineData.tipo || !routineData.frequencia || !routineData.hora_execucao) {
        sendValidationError(res, 'Campos obrigatórios: nome, tipo, frequencia, hora_execucao');
        return;
      }

      const dadosComProximaExecucao = {
        ...routineData,
        proxima_execucao: routineData.proxima_execucao ?? calculateNextExecution({
          hora_execucao: routineData.hora_execucao,
          frequencia: routineData.frequencia
        })
      };

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
      const updateData = req.body;

      const routineAntiga = await SaasScheduledRoutineService.getById(Number(id));
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
      await SchedulerService.getInstance().executeSaasRoutineManually(routineId);
      if (routine) {
        const dados = routine.toJSON ? routine.toJSON() as Record<string, unknown> : routine as unknown as Record<string, unknown>;
        await registrarAtualizacao(req as any, 'SaasScheduledRoutine', routineId, dados, dados, 'Execução manual da rotina', null);
      }
      sendSuccess(res, { message: 'Rotina iniciada em background' }, 'Rotina iniciada em background');
    } catch (error: unknown) {
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
