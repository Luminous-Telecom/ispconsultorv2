import { Request, Response } from 'express';
import { SchedulerService } from '../../../services/scheduler/SchedulerService';
import { ScheduledRoutineService } from '../../../services/scheduler/ScheduledRoutineService';
import { ScheduledRoutine } from '../../../models';
import { logger } from '../../../utils/logger';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import { sendSuccess, sendError, sendValidationError, sendNotFound } from '../../../utils/responseUtils';

export class SchedulerController {
  private schedulerService: SchedulerService;

  constructor() {
    this.schedulerService = SchedulerService.getInstance();
  }

  // Listar todas as rotinas
  public async index(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 15, search, sort = 'created_at', direction = 'desc' } = req.query;

      const result = await ScheduledRoutineService.list({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        sort: sort as string,
        direction: direction as 'asc' | 'desc'
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
      const routine = await this.schedulerService.getRoutineById(Number(id));

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

      const routine = await this.schedulerService.createRoutine(routineData);

      // Registrar auditoria
      try {
        await registrarCriacao(
          req,
          'ScheduledRoutine',
          routine.id,
          routine.toJSON ? routine.toJSON() as Record<string, unknown> : (routine as unknown as Record<string, unknown>)
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

      // Buscar rotina antes de atualizar para capturar dados anteriores
      const routineBefore = await ScheduledRoutineService.getById(Number(id));
      const dadosAnteriores = routineBefore ? (routineBefore.toJSON ? routineBefore.toJSON() as Record<string, unknown> : (routineBefore as unknown as Record<string, unknown>)) : {};

      const routine = await this.schedulerService.updateRoutine(Number(id), updateData);
      
      // Recarregar rotina para obter dados atualizados
      const routineAtualizada = await ScheduledRoutineService.getById(Number(id));
      if (!routineAtualizada) {
        sendNotFound(res, 'Rotina não encontrada após atualização');
        return;
      }

      // Registrar auditoria
      const dadosNovos = routineAtualizada.toJSON ? routineAtualizada.toJSON() as Record<string, unknown> : (routineAtualizada as unknown as Record<string, unknown>);
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      try {
        await registrarAtualizacao(
          req,
          'ScheduledRoutine',
          Number(id),
          dadosAnteriores,
          dadosNovos
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

      // Buscar rotina antes de deletar para capturar dados anteriores
      const routine = await ScheduledRoutineService.getById(Number(id));
      if (routine) {
        const dadosAnteriores = routine.toJSON ? routine.toJSON() as Record<string, unknown> : (routine as unknown as Record<string, unknown>);
        
        // Disponibilizar dados para o middleware
        setAuditData(req, dadosAnteriores);
        
        // Registrar auditoria
        await registrarExclusao(
          req,
          'ScheduledRoutine',
          Number(id),
          dadosAnteriores
        );
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

      if (typeof ativo !== 'boolean') {
        sendValidationError(res, 'Campo "ativo" deve ser um booleano');
        return;
      }

      // Buscar rotina antes de atualizar para capturar dados anteriores
      const routineBefore = await ScheduledRoutineService.getById(Number(id));
      const dadosAnteriores = routineBefore ? (routineBefore.toJSON ? routineBefore.toJSON() as Record<string, unknown> : (routineBefore as unknown as Record<string, unknown>)) : {};

      await this.schedulerService.toggleRoutine(Number(id), ativo);
      
      // Recarregar rotina para obter dados atualizados
      const routineAtualizada = await ScheduledRoutineService.getById(Number(id));
      if (!routineAtualizada) {
        sendNotFound(res, 'Rotina não encontrada após atualização');
        return;
      }

      // Registrar auditoria
      const dadosNovos = routineAtualizada.toJSON ? routineAtualizada.toJSON() as Record<string, unknown> : (routineAtualizada as unknown as Record<string, unknown>);
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      try {
        await registrarAtualizacao(
          req,
          'ScheduledRoutine',
          Number(id),
          dadosAnteriores,
          dadosNovos
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

      const resultado = await this.schedulerService.executeRoutineManually(Number(id));

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
      const status = this.schedulerService.getStatus();

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
      const logs = await this.schedulerService.getRecentExecutionLogs(50);

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