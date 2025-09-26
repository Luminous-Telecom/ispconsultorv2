import { Op } from 'sequelize';
import ScheduledRoutine from '../models/ScheduledRoutine';
import RoutineExecutionLog from '../models/RoutineExecutionLog';
import { GeracaoTitulosRoutine } from './routines/GeracaoTitulosRoutine';
import { EnvioBoletosRoutine } from './routines/EnvioBoletosRoutine';
import { RemessaBancariaRoutine } from './routines/RemessaBancariaRoutine';

export class SchedulerService {
  private static instance: SchedulerService;
  private routines: Map<string, any> = new Map();
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeRoutines();
  }

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  private initializeRoutines(): void {
    this.routines.set('geracao_titulos', new GeracaoTitulosRoutine());
    this.routines.set('envio_boletos', new EnvioBoletosRoutine());
    this.routines.set('remessa_bancaria', new RemessaBancariaRoutine());
  }

  /**
   * Inicia o agendador
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Scheduler já está em execução');
      return;
    }

    this.isRunning = true;
    console.log('Iniciando Scheduler Service...');

    // Executar verificação a cada minuto
    this.intervalId = setInterval(async () => {
      await this.checkAndExecuteRoutines();
    }, 60000); // 1 minuto

    // Executar imediatamente na inicialização
    await this.checkAndExecuteRoutines();
  }

  /**
   * Para o agendador
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Scheduler Service parado');
  }

  /**
   * Verifica e executa rotinas que estão no horário
   */
  private async checkAndExecuteRoutines(): Promise<void> {
    try {
      const now = new Date();
      
      // Buscar rotinas ativas que devem ser executadas
      const routinesToExecute = await ScheduledRoutine.findAll({
        where: {
          ativo: true,
          proxima_execucao: {
            [Op.lte]: now
          }
        }
      });

      console.log(`Encontradas ${routinesToExecute.length} rotinas para execução`);

      for (const routine of routinesToExecute) {
        await this.executeRoutine(routine);
      }
    } catch (error) {
      console.error('Erro ao verificar rotinas:', error);
    }
  }

  /**
   * Executa uma rotina específica
   */
  private async executeRoutine(routine: ScheduledRoutine): Promise<void> {
    const startTime = new Date();
    let executionLog: RoutineExecutionLog | null = null;

    try {
      console.log(`Executando rotina: ${routine.nome} (ID: ${routine.id})`);

      // Criar log de execução
      executionLog = await RoutineExecutionLog.create({
        routine_id: routine.id,
        status: 'executando',
        data_inicio: startTime
      });

      // Atualizar última execução
      await routine.update({
        ultima_execucao: startTime,
        total_execucoes: routine.total_execucoes + 1
      });

      // Executar a rotina específica
      const routineHandler = this.routines.get(routine.tipo);
      if (!routineHandler) {
        throw new Error(`Handler não encontrado para o tipo: ${routine.tipo}`);
      }

      const resultado = await routineHandler.execute(routine.configuracao);

      // Calcular próxima execução
      const proximaExecucao = this.calculateNextExecution(routine);

      // Atualizar rotina com sucesso
      await routine.update({
        proxima_execucao: proximaExecucao,
        execucoes_com_sucesso: routine.execucoes_com_sucesso + 1
      });

      // Finalizar log com sucesso
      const endTime = new Date();
      const duracao = endTime.getTime() - startTime.getTime();

      await executionLog.update({
        status: 'sucesso',
        data_fim: endTime,
        duracao_ms: duracao,
        resultado: resultado
      });

      console.log(`Rotina ${routine.nome} executada com sucesso em ${duracao}ms`);

    } catch (error: any) {
      console.error(`Erro ao executar rotina ${routine.nome}:`, error);

      // Atualizar contador de erros
      await routine.update({
        execucoes_com_erro: routine.execucoes_com_erro + 1
      });

      // Finalizar log com erro
      if (executionLog) {
        const endTime = new Date();
        const duracao = endTime.getTime() - startTime.getTime();

        await executionLog.update({
          status: 'erro',
          data_fim: endTime,
          duracao_ms: duracao,
          erro: error.message,
          stack_trace: error.stack
        });
      }
    }
  }

  /**
   * Calcula a próxima execução baseada na frequência
   */
  private calculateNextExecution(routine: ScheduledRoutine): Date {
    const now = new Date();
    const next = new Date(now);

    switch (routine.frequencia) {
      case 'diaria':
        next.setDate(next.getDate() + 1);
        break;

      case 'semanal':
        if (routine.dia_semana !== null && routine.dia_semana !== undefined) {
          const daysUntilNext = (routine.dia_semana - next.getDay() + 7) % 7;
          next.setDate(next.getDate() + (daysUntilNext === 0 ? 7 : daysUntilNext));
        } else {
          next.setDate(next.getDate() + 7);
        }
        break;

      case 'mensal':
        if (routine.dia_execucao) {
          next.setMonth(next.getMonth() + 1);
          next.setDate(routine.dia_execucao);
        } else {
          next.setMonth(next.getMonth() + 1);
        }
        break;

      case 'anual':
        next.setFullYear(next.getFullYear() + 1);
        break;

      case 'personalizada':
        // Para expressões cron personalizadas, usar uma biblioteca como node-cron
        // Por simplicidade, vamos assumir execução diária
        next.setDate(next.getDate() + 1);
        break;
    }

    // Definir a hora de execução
    const [hours, minutes] = routine.hora_execucao.split(':').map(Number);
    next.setHours(hours, minutes, 0, 0);

    return next;
  }

  /**
   * Cria uma nova rotina agendada
   */
  public async createRoutine(data: {
    nome: string;
    tipo: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'outros';
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
      proxima_execucao: this.calculateNextExecution({
        ...data,
        ativo: true,
        total_execucoes: 0,
        execucoes_com_sucesso: 0,
        execucoes_com_erro: 0,
        created_at: new Date(),
        updated_at: new Date()
      } as ScheduledRoutine)
    });

    console.log(`Rotina criada: ${routine.nome} (ID: ${routine.id})`);
    return routine;
  }

  /**
   * Ativa/desativa uma rotina
   */
  public async toggleRoutine(routineId: number, ativo: boolean): Promise<void> {
    const routine = await ScheduledRoutine.findByPk(routineId);
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }

    await routine.update({ ativo });
    console.log(`Rotina ${routine.nome} ${ativo ? 'ativada' : 'desativada'}`);
  }

  /**
   * Executa uma rotina manualmente
   */
  public async executeRoutineManually(routineId: number): Promise<void> {
    const routine = await ScheduledRoutine.findByPk(routineId);
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }

    await this.executeRoutine(routine);
  }

  /**
   * Lista todas as rotinas
   */
  public async listRoutines(): Promise<ScheduledRoutine[]> {
    return await ScheduledRoutine.findAll({
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Obtém logs de execução de uma rotina
   */
  public async getExecutionLogs(routineId: number, limit = 50): Promise<RoutineExecutionLog[]> {
    return await RoutineExecutionLog.findAll({
      where: { routine_id: routineId },
      order: [['data_inicio', 'DESC']],
      limit
    });
  }
}
