import * as cron from 'node-cron';
import { ScheduledRoutine, RoutineExecutionLog } from '../models';

export class SchedulerService {
  private static instance: SchedulerService;
  private cronJobs: Map<number, cron.ScheduledTask> = new Map();
  private isRunning = false;

  private constructor() {}

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Carregar rotinas ativas do banco de dados
    await this.loadRoutinesFromDatabase();

  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Parar todos os cron jobs
    this.cronJobs.forEach((job, _routineId) => {
      job.destroy();
    });

    this.cronJobs.clear();
    this.isRunning = false;
  }

  private async loadRoutinesFromDatabase(): Promise<void> {
    try {
      const routines = await ScheduledRoutine.findAll({
        where: { ativo: true }
      });


      for (const routine of routines) {
        await this.scheduleRoutine(routine);
      }
    } catch (error) {
      console.error('Erro ao carregar rotinas do banco de dados:', error);
    }
  }

  public async scheduleRoutine(routine: ScheduledRoutine): Promise<void> {
    if (!routine.ativo) {
      return;
    }

    // Parar job existente se houver
    if (this.cronJobs.has(routine.id)) {
      this.unscheduleRoutine(routine.id);
    }

    const cronExpression = this.buildCronExpression(routine);
    
    if (!cron.validate(cronExpression)) {
      console.error(`Expressão cron inválida para rotina ${routine.id}: ${cronExpression}`);
      return;
    }

    const job = cron.schedule(cronExpression, async () => {
      await this.runRoutine(routine);
    });

    job.start();
    this.cronJobs.set(routine.id, job);

  }

  public unscheduleRoutine(routineId: number): void {
    const job = this.cronJobs.get(routineId);
    if (job) {
      job.destroy();
      this.cronJobs.delete(routineId);
    }
  }

  private buildCronExpression(routine: ScheduledRoutine): string {
    const [hours, minutes] = routine.hora_execucao.split(':');

    switch (routine.frequencia) {
      case 'diaria':
        return `${minutes} ${hours} * * *`;
      
      case 'semanal':
        const dayOfWeek = routine.dia_semana || 0;
        return `${minutes} ${hours} * * ${dayOfWeek}`;
      
      case 'mensal':
        const dayOfMonth = routine.dia_execucao || 1;
        return `${minutes} ${hours} ${dayOfMonth} * *`;
      
      case 'anual':
        const day = routine.dia_execucao || 1;
        return `${minutes} ${hours} ${day} 1 *`;
      
      case 'personalizada':
        return routine.cron_expression || `${minutes} ${hours} * * *`;
      
      default:
        return `${minutes} ${hours} * * *`;
    }
  }

  private async runRoutine(routine: ScheduledRoutine): Promise<void> {
    const startTime = new Date();
    let executionLog: RoutineExecutionLog | null = null;

    try {
      // Criar log de execução
      executionLog = await RoutineExecutionLog.create({
        routine_id: routine.id,
        status: 'executando',
        data_inicio: startTime,
        created_at: new Date()
      });

      // Executar a rotina baseada no tipo
      const resultado = await this.executeRoutineByType(routine);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Verificar se houve erros nos resultados da rotina
      let statusFinal = 'sucesso';
      let temErros = false;

      if (resultado && typeof resultado === 'object') {
        // Para rotina de geração de títulos
        if (resultado.carnês_erro && resultado.carnês_erro > 0) {
          temErros = true;
        }
        if (resultado.títulos_erro && resultado.títulos_erro > 0) {
          temErros = true;
        }
        
        // Para outras rotinas, verificar se há erros nos detalhes
        if (resultado.detalhes && Array.isArray(resultado.detalhes)) {
          const errosDetalhes = resultado.detalhes.filter((d: any) => d.status === 'erro');
          if (errosDetalhes.length > 0) {
            temErros = true;
          }
        }
      }

      if (temErros) {
        statusFinal = 'erro';
      }

      // Atualizar log com status correto
      await executionLog.update({
        status: statusFinal as 'sucesso' | 'erro',
        data_fim: endTime,
        duracao_ms: duration,
        resultado: resultado
      });

      // Atualizar contadores da rotina
      await routine.increment('total_execucoes');
      if (statusFinal === 'sucesso') {
        await routine.increment('execucoes_com_sucesso');
      } else {
        await routine.increment('execucoes_com_erro');
      }
      await routine.update({ ultima_execucao: endTime });

    } catch (error: any) {
      console.error(`Erro ao executar rotina ${routine.nome}:`, error);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Atualizar log com erro
      if (executionLog) {
        await executionLog.update({
          status: 'erro',
          data_fim: endTime,
          duracao_ms: duration,
          erro: error.message,
          stack_trace: error.stack
        });
      }

      // Atualizar contadores da rotina
      await routine.increment(['total_execucoes', 'execucoes_com_erro']);
      await routine.update({ ultima_execucao: endTime });
    }
  }

  private async executeRoutineByType(routine: ScheduledRoutine): Promise<any> {
    switch (routine.tipo) {
      case 'geracao_titulos':
        return await this.executeGeracaoTitulos(routine);
      
      case 'envio_boletos':
        return await this.executeEnvioBoletos(routine);
      
      case 'remessa_bancaria':
        return await this.executeRemessaBancaria(routine);
      
      default:
        return { message: 'Tipo de rotina não implementado' };
    }
  }

  private async executeGeracaoTitulos(routine: ScheduledRoutine): Promise<any> {
    // Geração de títulos não está mais disponível - funcionalidade de carnê foi removida
    
    return {
      success: false,
      message: 'Geração de títulos não está mais disponível - funcionalidade de carnê foi removida'
    };
  }

  private async executeEnvioBoletos(routine: ScheduledRoutine): Promise<any> {
    // Implementar lógica de envio de boletos
    
    return {
      boletos_enviados: 0,
      emails_enviados: 0,
      message: 'Envio de boletos executado'
    };
  }

  private async executeRemessaBancaria(routine: ScheduledRoutine): Promise<any> {
    // Implementar lógica de remessa bancária
    
    return {
      remessas_geradas: 0,
      bancos_processados: 0,
      message: 'Remessa bancária executada'
    };
  }

  public async createRoutine(data: {
    nome: string;
    tipo: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'verificar_vencimentos' | 'outros';
    descricao?: string;
    configuracao: any;
    frequencia: 'diaria' | 'semanal' | 'mensal' | 'anual' | 'personalizada';
    dia_execucao?: number;
    hora_execucao: string;
    dia_semana?: number;
    cron_expression?: string;
  }): Promise<ScheduledRoutine> {
    const routine = await ScheduledRoutine.create({
      ...data,
      ativo: true,
      proxima_execucao: this.calculateNextExecution(data)
    });

    return routine;
  }

  public async updateRoutine(id: number, data: Partial<ScheduledRoutine>): Promise<ScheduledRoutine> {
    const routine = await ScheduledRoutine.findByPk(id);
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }

    // Se a hora de execução ou frequência mudaram, recalcular próxima execução
    const shouldRecalculateNextExecution = 
      data.hora_execucao !== undefined || 
      data.frequencia !== undefined || 
      data.dia_execucao !== undefined || 
      data.dia_semana !== undefined;


    if (shouldRecalculateNextExecution) {
      // Usar os novos dados ou os existentes para recalcular
      const updatedData = { 
        ...routine.get({ plain: true }), 
        ...data 
      };
      data.proxima_execucao = this.calculateNextExecution(updatedData);
    }

    await routine.update(data);
    
    // Recarregar a rotina do banco para verificar se foi salva
    const _updatedRoutine = await ScheduledRoutine.findByPk(id);
    
    // Reagendar se a rotina estiver ativa
    if (routine.ativo) {
      await this.scheduleRoutine(routine);
    } else {
      this.unscheduleRoutine(id);
    }

    return routine;
  }

  public async deleteRoutine(id: number): Promise<void> {
    const routine = await ScheduledRoutine.findByPk(id);
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }

    // Parar cron job
    this.unscheduleRoutine(id);
    
    // Deletar rotina
    await routine.destroy();

  }

  public async toggleRoutine(id: number, ativo: boolean): Promise<ScheduledRoutine> {
    const routine = await ScheduledRoutine.findByPk(id);
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }

    await routine.update({ ativo });

    if (ativo) {
      await this.scheduleRoutine(routine);
    } else {
      this.unscheduleRoutine(id);
    }

    return routine;
  }

  public async executeRoutineManually(id: number): Promise<any> {
    const routine = await ScheduledRoutine.findByPk(id);
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }

    
    // Usar runRoutine para criar logs completos - isso já executa a rotina
    await this.runRoutine(routine);
    
    // Não executar novamente - runRoutine já fez isso
    return { message: 'Rotina executada com sucesso' };
  }


  private calculateNextExecution(routine: any): Date {
    const now = new Date();
    const [hours, minutes] = routine.hora_execucao.split(':');
    
    const nextExecution = new Date();
    nextExecution.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Se já passou hoje, agendar para o próximo período baseado na frequência
    if (nextExecution <= now) {
      const _oldDate = nextExecution.getDate();
      const _oldMonth = nextExecution.getMonth();
      const _oldYear = nextExecution.getFullYear();
      
      switch (routine.frequencia) {
        case 'diaria':
          nextExecution.setDate(nextExecution.getDate() + 1);
          break;
        case 'semanal':
          nextExecution.setDate(nextExecution.getDate() + 7);
          break;
        case 'mensal':
          nextExecution.setMonth(nextExecution.getMonth() + 1);
          break;
        case 'anual':
          nextExecution.setFullYear(nextExecution.getFullYear() + 1);
          break;
        default:
          nextExecution.setDate(nextExecution.getDate() + 1);
      }
    }

    return nextExecution;
  }

  public getStatus(): any {
    return {
      isRunning: this.isRunning,
      activeJobs: this.cronJobs.size,
      scheduledRoutines: Array.from(this.cronJobs.keys())
    };
  }

  public async getAllRoutines(): Promise<ScheduledRoutine[]> {
    return await ScheduledRoutine.findAll({
      include: [{
        model: RoutineExecutionLog,
        as: 'executionLogs',
        limit: 5,
        order: [['created_at', 'DESC']]
      }]
    });
  }

  public async getRoutineById(id: number): Promise<ScheduledRoutine | null> {
    return await ScheduledRoutine.findByPk(id, {
      include: [{
        model: RoutineExecutionLog,
        as: 'executionLogs',
        limit: 10,
        order: [['created_at', 'DESC']]
      }]
    });
  }

  public getWorkersStatus(): any {
    return {
      totalWorkers: this.cronJobs.size,
      activeWorkers: this.cronJobs.size,
      workers: Array.from(this.cronJobs.keys()).map(id => ({
        id,
        status: 'active',
        lastActivity: new Date()
      }))
    };
  }

  public getHealthStatus(): any {
    return {
      status: this.isRunning ? 'healthy' : 'stopped',
      isRunning: this.isRunning,
      activeJobs: this.cronJobs.size,
      uptime: process.uptime()
    };
  }

  public getDetailedStats(): any {
    return {
      scheduler: {
        isRunning: this.isRunning,
        activeJobs: this.cronJobs.size,
        uptime: process.uptime()
      },
      system: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime()
      }
    };
  }

  public async getExecutionLogs(routineId?: number): Promise<any[]> {
    const where: any = {};
    if (routineId) {
      where.routine_id = routineId;
    }

    try {
      const logs = await RoutineExecutionLog.findAll({
        where,
        include: [{
          model: ScheduledRoutine,
          as: 'routine',
          attributes: ['nome', 'tipo']
        }],
        order: [['created_at', 'DESC']],
        limit: 100
      });

      return logs;
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      throw error;
    }
  }

  public async getRecentExecutionLogs(limit: number = 10): Promise<any[]> {
    return await RoutineExecutionLog.findAll({
      include: [{
        model: ScheduledRoutine,
        as: 'routine',
        attributes: ['nome', 'tipo']
      }],
      order: [['created_at', 'DESC']],
      limit
    });
  }
}

export default SchedulerService;