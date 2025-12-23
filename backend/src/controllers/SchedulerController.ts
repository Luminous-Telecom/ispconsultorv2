import { Request, Response } from 'express';
import { Op, WhereOptions } from 'sequelize';
import { SchedulerService } from '../services/SchedulerService';
import { ScheduledRoutine } from '../models';
import { logger } from '../utils/logger';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../services/AuditoriaService';

export class SchedulerController {
  private schedulerService: SchedulerService;

  constructor() {
    this.schedulerService = SchedulerService.getInstance();
  }

  // Listar todas as rotinas
  public async index(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 15, search, sort = 'created_at', direction = 'desc' } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const where: WhereOptions = {};

      // Filtro de busca
      if (search) {
        (where as Record<symbol, unknown>)[Op.or] = [
          { nome: { [Op.like]: `%${search}%` } },
          { tipo: { [Op.like]: `%${search}%` } },
          { descricao: { [Op.like]: `%${search}%` } }
        ];
      }

      const routines = await ScheduledRoutine.findAndCountAll({
        where,
        limit: Number(limit),
        offset,
        order: [[sort as string, direction as 'asc' | 'desc']]
      });

      const totalPages = Math.ceil(routines.count / Number(limit));

      res.json({
        success: true,
        data: routines.rows,
        pagination: {
          total: routines.count,
          page: Number(page),
          limit: Number(limit),
          pages: totalPages
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao listar rotinas', {
        context: 'SchedulerController',
        action: 'index',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: errorMessage
      });
    }
  }

  // Obter rotina por ID
  public async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const routine = await this.schedulerService.getRoutineById(Number(id));

      if (!routine) {
        res.status(404).json({
          success: false,
          message: 'Rotina não encontrada'
        });
        return;
      }

      res.json({
        success: true,
        data: routine
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter rotina', {
        context: 'SchedulerController',
        action: 'show',
        error: errorMessage,
        stack: errorStack,
        rotinaId: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: errorMessage
      });
    }
  }

  // Criar nova rotina
  public async store(req: Request, res: Response): Promise<void> {
    try {
      const routineData = req.body;

      // Validações básicas
      if (!routineData.nome || !routineData.tipo || !routineData.frequencia || !routineData.hora_execucao) {
        res.status(400).json({
          success: false,
          message: 'Campos obrigatórios: nome, tipo, frequencia, hora_execucao'
        });
        return;
      }

      const routine = await this.schedulerService.createRoutine(routineData);

      // Registrar auditoria
      await registrarCriacao(
        req,
        'ScheduledRoutine',
        routine.id,
        routine.toJSON ? routine.toJSON() as Record<string, unknown> : (routine as unknown as Record<string, unknown>)
      );

      res.status(201).json({
        success: true,
        message: 'Rotina criada com sucesso',
        data: routine
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao criar rotina', {
        context: 'SchedulerController',
        action: 'create',
        error: errorMessage,
        stack: errorStack,
        body: req.body
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: errorMessage
      });
    }
  }

  // Atualizar rotina
  public async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Buscar rotina antes de atualizar para capturar dados anteriores
      const routineBefore = await ScheduledRoutine.findByPk(Number(id));
      const dadosAnteriores = routineBefore ? (routineBefore.toJSON ? routineBefore.toJSON() as Record<string, unknown> : (routineBefore as unknown as Record<string, unknown>)) : {};

      const routine = await this.schedulerService.updateRoutine(Number(id), updateData);

      // Registrar auditoria
      const dadosNovos = routine.toJSON ? routine.toJSON() as Record<string, unknown> : (routine as unknown as Record<string, unknown>);
      await registrarAtualizacao(
        req,
        'ScheduledRoutine',
        Number(id),
        dadosAnteriores,
        dadosNovos
      );

      res.json({
        success: true,
        message: 'Rotina atualizada com sucesso',
        data: routine
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao atualizar rotina', {
        context: 'SchedulerController',
        action: 'update',
        error: errorMessage,
        stack: errorStack,
        rotinaId: req.params.id,
        body: req.body
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: errorMessage
      });
    }
  }

  // Deletar rotina
  public async destroy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Buscar rotina antes de deletar para capturar dados anteriores
      const routine = await ScheduledRoutine.findByPk(Number(id));
      if (routine) {
        const dadosAnteriores = routine.toJSON ? routine.toJSON() as Record<string, unknown> : (routine as unknown as Record<string, unknown>);
        
        // Registrar auditoria
        await registrarExclusao(
          req,
          'ScheduledRoutine',
          Number(id),
          dadosAnteriores
        );
      }

      await this.schedulerService.deleteRoutine(Number(id));

      res.json({
        success: true,
        message: 'Rotina deletada com sucesso'
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao deletar rotina', {
        context: 'SchedulerController',
        action: 'delete',
        error: errorMessage,
        stack: errorStack,
        rotinaId: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: errorMessage
      });
    }
  }

  // Ativar/Desativar rotina
  public async toggle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { ativo } = req.body;

      if (typeof ativo !== 'boolean') {
        res.status(400).json({
          success: false,
          message: 'Campo "ativo" deve ser um booleano'
        });
        return;
      }

      const routine = await this.schedulerService.toggleRoutine(Number(id), ativo);

      res.json({
        success: true,
        message: `Rotina ${ativo ? 'ativada' : 'desativada'} com sucesso`,
        data: routine
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao alterar status da rotina', {
        context: 'SchedulerController',
        action: 'toggleStatus',
        error: errorMessage,
        stack: errorStack,
        rotinaId: req.params.id,
        body: req.body
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: errorMessage
      });
    }
  }

  // Executar rotina manualmente
  public async execute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const resultado = await this.schedulerService.executeRoutineManually(Number(id));

      res.json({
        success: true,
        message: 'Rotina iniciada em background',
        data: resultado
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao executar rotina', {
        context: 'SchedulerController',
        action: 'execute',
        error: errorMessage,
        stack: errorStack,
        rotinaId: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: errorMessage
      });
    }
  }


  // Status do scheduler
  public async status(req: Request, res: Response): Promise<void> {
    try {
      const status = this.schedulerService.getStatus();

      res.json({
        success: true,
        data: status
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter status do scheduler', {
        context: 'SchedulerController',
        action: 'getStatus',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: errorMessage
      });
    }
  }

  // Obter logs de execução de uma rotina específica
  public async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const routineId = Number(id);
      
      if (isNaN(routineId)) {
        res.status(400).json({
          success: false,
          message: 'ID da rotina inválido'
        });
        return;
      }

      const logs = await this.schedulerService.getExecutionLogs(routineId);

      res.json({
        success: true,
        data: logs
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter logs de execução', {
        context: 'SchedulerController',
        action: 'getLogsByRoutine',
        error: errorMessage,
        stack: errorStack,
        rotinaId: req.params.id,
        query: req.query
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: errorMessage
      });
    }
  }

  // Obter todos os logs de execução
  public async getAllLogs(req: Request, res: Response): Promise<void> {
    try {
      const logs = await this.schedulerService.getRecentExecutionLogs(50);

      res.json({
        success: true,
        data: logs
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter logs de execução', {
        context: 'SchedulerController',
        action: 'getAllLogs',
        error: errorMessage,
        stack: errorStack,
        query: req.query
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: errorMessage
      });
    }
  }
}

export default SchedulerController;