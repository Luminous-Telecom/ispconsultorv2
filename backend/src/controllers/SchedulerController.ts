import { Request, Response } from 'express';
import { SchedulerService } from '../services/SchedulerService';
import ScheduledRoutine from '../models/ScheduledRoutine';
import RoutineExecutionLog from '../models/RoutineExecutionLog';

export class SchedulerController {
  private schedulerService: SchedulerService;

  constructor() {
    this.schedulerService = SchedulerService.getInstance();
  }

  /**
   * Lista todas as rotinas agendadas
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 15, ativo, tipo } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const whereClause: any = {};
      if (ativo !== undefined) {
        whereClause.ativo = ativo === 'true';
      }
      if (tipo) {
        whereClause.tipo = tipo;
      }

      const { count, rows: routines } = await ScheduledRoutine.findAndCountAll({
        where: whereClause,
        limit: Number(limit),
        offset,
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: routines,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit))
        }
      });
    } catch (error: any) {
      console.error('Erro ao listar rotinas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Obtém uma rotina específica
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const routine = await ScheduledRoutine.findByPk(id);

      if (!routine) {
        res.status(404).json({
          success: false,
          error: 'Rotina não encontrada'
        });
        return;
      }

      res.json({
        success: true,
        data: routine
      });
    } catch (error: any) {
      console.error('Erro ao obter rotina:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Cria uma nova rotina agendada
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        nome,
        tipo,
        descricao,
        configuracao,
        frequencia,
        dia_execucao,
        hora_execucao,
        dia_semana,
        cron_expression
      } = req.body;

      // Validações básicas
      if (!nome || !tipo || !frequencia || !hora_execucao) {
        res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: nome, tipo, frequencia, hora_execucao'
        });
        return;
      }

      const schedulerService = SchedulerService.getInstance();
      const routine = await schedulerService.createRoutine({
        nome,
        tipo,
        descricao,
        configuracao,
        frequencia,
        dia_execucao,
        hora_execucao,
        dia_semana,
        cron_expression
      });

      res.status(201).json({
        success: true,
        message: 'Rotina criada com sucesso',
        data: routine
      });
    } catch (error: any) {
      console.error('Erro ao criar rotina:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Atualiza uma rotina existente
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const routine = await ScheduledRoutine.findByPk(id);
      if (!routine) {
        res.status(404).json({
          success: false,
          error: 'Rotina não encontrada'
        });
        return;
      }

      // Remover campos que não devem ser atualizados diretamente
      delete updateData.id;
      delete updateData.created_at;
      delete updateData.updated_at;
      delete updateData.total_execucoes;
      delete updateData.execucoes_com_sucesso;
      delete updateData.execucoes_com_erro;

      await routine.update(updateData);

      res.json({
        success: true,
        message: 'Rotina atualizada com sucesso',
        data: routine
      });
    } catch (error: any) {
      console.error('Erro ao atualizar rotina:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Ativa/desativa uma rotina
   */
  static async toggle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { ativo } = req.body;

      if (typeof ativo !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'Campo "ativo" deve ser um boolean'
        });
        return;
      }

      const schedulerService = SchedulerService.getInstance();
      await schedulerService.toggleRoutine(Number(id), ativo);

      res.json({
        success: true,
        message: `Rotina ${ativo ? 'ativada' : 'desativada'} com sucesso`
      });
    } catch (error: any) {
      console.error('Erro ao alterar status da rotina:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Executa uma rotina manualmente
   */
  static async execute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const schedulerService = SchedulerService.getInstance();
      await schedulerService.executeRoutineManually(Number(id));

      res.json({
        success: true,
        message: 'Rotina executada com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao executar rotina:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Remove uma rotina
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const routine = await ScheduledRoutine.findByPk(id);
      if (!routine) {
        res.status(404).json({
          success: false,
          error: 'Rotina não encontrada'
        });
        return;
      }

      await routine.destroy();

      res.json({
        success: true,
        message: 'Rotina removida com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao remover rotina:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Obtém logs de execução de uma rotina
   */
  static async getExecutionLogs(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit = 50 } = req.query;

      const routine = await ScheduledRoutine.findByPk(id);
      if (!routine) {
        res.status(404).json({
          success: false,
          error: 'Rotina não encontrada'
        });
        return;
      }

      const schedulerService = SchedulerService.getInstance();
      const logs = await schedulerService.getExecutionLogs(Number(id), Number(limit));

      res.json({
        success: true,
        data: logs
      });
    } catch (error: any) {
      console.error('Erro ao obter logs de execução:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Obtém estatísticas das rotinas
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const totalRoutines = await ScheduledRoutine.count();
      const activeRoutines = await ScheduledRoutine.count({ where: { ativo: true } });
      const inactiveRoutines = await ScheduledRoutine.count({ where: { ativo: false } });

      // Estatísticas por tipo
      const statsByType = await ScheduledRoutine.findAll({
        attributes: [
          'tipo',
          [ScheduledRoutine.sequelize!.fn('COUNT', ScheduledRoutine.sequelize!.col('id')), 'total'],
          [ScheduledRoutine.sequelize!.fn('SUM', ScheduledRoutine.sequelize!.col('total_execucoes')), 'total_execucoes'],
          [ScheduledRoutine.sequelize!.fn('SUM', ScheduledRoutine.sequelize!.col('execucoes_com_sucesso')), 'execucoes_sucesso'],
          [ScheduledRoutine.sequelize!.fn('SUM', ScheduledRoutine.sequelize!.col('execucoes_com_erro')), 'execucoes_erro']
        ],
        group: ['tipo'],
        raw: true
      });

      // Últimas execuções
      const lastExecutions = await RoutineExecutionLog.findAll({
        include: [
          {
            model: ScheduledRoutine,
            as: 'Routine',
            attributes: ['nome', 'tipo']
          }
        ],
        order: [['data_inicio', 'DESC']],
        limit: 10
      });

      res.json({
        success: true,
        data: {
          total_routines: totalRoutines,
          active_routines: activeRoutines,
          inactive_routines: inactiveRoutines,
          stats_by_type: statsByType,
          last_executions: lastExecutions
        }
      });
    } catch (error: any) {
      console.error('Erro ao obter estatísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Inicia o agendador
   */
  static async start(req: Request, res: Response): Promise<void> {
    try {
      const schedulerService = SchedulerService.getInstance();
      await schedulerService.start();

      res.json({
        success: true,
        message: 'Agendador iniciado com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao iniciar agendador:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Para o agendador
   */
  static async stop(req: Request, res: Response): Promise<void> {
    try {
      const schedulerService = SchedulerService.getInstance();
      schedulerService.stop();

      res.json({
        success: true,
        message: 'Agendador parado com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao parar agendador:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }
}
