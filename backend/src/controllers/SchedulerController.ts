import { Request, Response } from 'express';
import { SchedulerService } from '../services/SchedulerService';
import { ScheduledRoutine } from '../models';

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
      const where: any = {};

      // Filtro de busca
      if (search) {
        where[require('sequelize').Op.or] = [
          { nome: { [require('sequelize').Op.like]: `%${search}%` } },
          { tipo: { [require('sequelize').Op.like]: `%${search}%` } },
          { descricao: { [require('sequelize').Op.like]: `%${search}%` } }
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
      console.error('Erro ao listar rotinas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
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
      console.error('Erro ao obter rotina:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
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

      res.status(201).json({
        success: true,
        message: 'Rotina criada com sucesso',
        data: routine
      });
    } catch (error: unknown) {
      console.error('Erro ao criar rotina:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Atualizar rotina
  public async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;


      const routine = await this.schedulerService.updateRoutine(Number(id), updateData);


      res.json({
        success: true,
        message: 'Rotina atualizada com sucesso',
        data: routine
      });
    } catch (error: unknown) {
      console.error('Erro ao atualizar rotina:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Deletar rotina
  public async destroy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.schedulerService.deleteRoutine(Number(id));

      res.json({
        success: true,
        message: 'Rotina deletada com sucesso'
      });
    } catch (error: unknown) {
      console.error('Erro ao deletar rotina:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
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
      console.error('Erro ao alterar status da rotina:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
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
        message: 'Rotina executada com sucesso',
        data: resultado
      });
    } catch (error: unknown) {
      console.error('Erro ao executar rotina:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
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
      console.error('Erro ao obter status do scheduler:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
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
      console.error('Erro ao obter logs de execução:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
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
      console.error('Erro ao obter logs de execução:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
}

export default SchedulerController;