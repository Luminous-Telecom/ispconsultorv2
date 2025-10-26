import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import ScheduledRoutine from '../models/ScheduledRoutine';
import RoutineExecutionLog from '../models/RoutineExecutionLog';
import { EnvioBoletosRoutine } from '../services/routines/EnvioBoletosRoutine';
import { RemessaBancariaRoutine } from '../services/routines/RemessaBancariaRoutine';
import { IRoutine } from '../interfaces/IRoutine';

export interface WorkerMessage {
  type: 'execute' | 'status' | 'error' | 'complete';
  data?: any;
  error?: string;
  routineId?: number;
  executionId?: number;
}

export interface WorkerData {
  routineId: number;
  routineData: any;
  executionId: number;
}

class SchedulerWorker {
  private static workers: Map<number, Worker> = new Map();
  private static maxWorkers = 5;
  private static activeWorkers = 0;

  /**
   * Executa uma rotina em um worker separado
   */
  static async executeRoutine(routineId: number, routineData: any): Promise<number> {
    if (this.activeWorkers >= this.maxWorkers) {
      throw new Error('Número máximo de workers ativos atingido');
    }

    // Criar log de execução
    const executionLog = await RoutineExecutionLog.create({
      routine_id: routineId,
      status: 'executando',
      data_inicio: new Date(),
      resultado: {
        worker_id: this.activeWorkers + 1,
        timestamp: new Date().toISOString()
      }
    });

    const workerData: WorkerData = {
      routineId,
      routineData,
      executionId: executionLog.id
    };

    return new Promise((resolve, reject) => {
      const worker = new Worker(__filename, {
        workerData
      });

      this.workers.set(executionLog.id, worker);
      this.activeWorkers++;

      worker.on('message', async (message: WorkerMessage) => {
        try {
          await this.handleWorkerMessage(message, executionLog.id);
          
          if (message.type === 'complete' || message.type === 'error') {
            this.cleanupWorker(executionLog.id);
            if (message.type === 'complete') {
              resolve(executionLog.id);
            } else {
              reject(new Error(message.error));
            }
          }
        } catch (error) {
          console.error('Erro ao processar mensagem do worker:', error);
          this.cleanupWorker(executionLog.id);
          reject(error);
        }
      });

      worker.on('error', async (error) => {
        console.error('Erro no worker:', error);
        await this.logExecutionError(executionLog.id, error.message);
        this.cleanupWorker(executionLog.id);
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Worker parou com código ${code}`);
        }
        this.cleanupWorker(executionLog.id);
      });

      // Timeout de 30 minutos
      setTimeout(() => {
        if (this.workers.has(executionLog.id)) {
          console.warn(`Worker ${executionLog.id} atingiu timeout`);
          worker.terminate();
          this.cleanupWorker(executionLog.id);
        }
      }, 30 * 60 * 1000);
    });
  }

  /**
   * Processa mensagens dos workers
   */
  private static async handleWorkerMessage(message: WorkerMessage, executionId: number): Promise<void> {
    const executionLog = await RoutineExecutionLog.findByPk(executionId);
    if (!executionLog) return;

    switch (message.type) {
      case 'status':
        await executionLog.update({
          resultado: {
            ...executionLog.resultado,
            ...message.data,
            last_update: new Date().toISOString()
          }
        });
        break;

      case 'complete':
        await executionLog.update({
          status: 'sucesso',
          data_fim: new Date(),
          duracao_ms: message.data?.duration || 0,
          resultado: {
            ...executionLog.resultado,
            ...message.data,
            completed_at: new Date().toISOString()
          }
        });
        break;

      case 'error':
        await executionLog.update({
          status: 'erro',
          data_fim: new Date(),
          duracao_ms: message.data?.duration || 0,
          erro: message.error || 'Erro na execução',
          resultado: {
            ...executionLog.resultado,
            error: message.error,
            error_data: message.data,
            failed_at: new Date().toISOString()
          }
        });
        break;
    }
  }

  /**
   * Registra erro de execução
   */
  private static async logExecutionError(executionId: number, error: string): Promise<void> {
    try {
      const executionLog = await RoutineExecutionLog.findByPk(executionId);
      if (executionLog) {
        await executionLog.update({
          status: 'erro',
          data_fim: new Date(),
          erro: error,
          resultado: {
            ...executionLog.resultado,
            error,
            failed_at: new Date().toISOString()
          }
        });
      }
    } catch (err) {
      console.error('Erro ao registrar falha de execução:', err);
    }
  }

  /**
   * Limpa recursos do worker
   */
  private static cleanupWorker(executionId: number): void {
    const worker = this.workers.get(executionId);
    if (worker) {
      worker.terminate();
      this.workers.delete(executionId);
      this.activeWorkers--;
    }
  }

  /**
   * Obtém status dos workers ativos
   */
  static getWorkersStatus(): { active: number; max: number; workers: any[] } {
    return {
      active: this.activeWorkers,
      max: this.maxWorkers,
      workers: Array.from(this.workers.entries()).map(([id, worker]) => ({
        executionId: id,
        threadId: worker.threadId,
        isRunning: worker.threadId !== undefined
      }))
    };
  }

  /**
   * Para todos os workers
   */
  static async stopAllWorkers(): Promise<void> {
    const promises = Array.from(this.workers.values()).map(worker => {
      return new Promise<void>((resolve) => {
        worker.terminate();
        worker.on('exit', () => resolve());
      });
    });

    await Promise.all(promises);
    this.workers.clear();
    this.activeWorkers = 0;
  }
}

// Código executado no worker
if (!isMainThread && workerData) {
  (async () => {
    const { routineId, routineData: _routineData, executionId } = workerData as WorkerData;
    const startTime = Date.now();

    try {
      // Enviar status inicial
      parentPort?.postMessage({
        type: 'status',
        routineId,
        executionId,
        data: { message: 'Iniciando execução da rotina' }
      } as WorkerMessage);

      // Buscar dados da rotina
      const routine = await ScheduledRoutine.findByPk(routineId, {
        include: ['executionLogs']
      });

      if (!routine) {
        throw new Error('Rotina não encontrada');
      }

      // Criar instância da rotina baseada no tipo
      let routineInstance: IRoutine;
      switch (routine.tipo) {
        case 'geracao_titulos':
          // Funcionalidade de carnê foi removida
          throw new Error('Geração de títulos não está mais disponível - funcionalidade de carnê foi removida');
        case 'envio_boletos':
          routineInstance = new EnvioBoletosRoutine();
          break;
        case 'remessa_bancaria':
          routineInstance = new RemessaBancariaRoutine();
          break;
        case 'verificar_vencimentos':
          const { VerificarVencimentosRoutine } = await import('../services/routines/VerificarVencimentosRoutine');
          routineInstance = new VerificarVencimentosRoutine();
          break;
        default:
          throw new Error(`Tipo de rotina não suportado: ${routine.tipo}`);
      }

      // Enviar status de progresso
      parentPort?.postMessage({
        type: 'status',
        routineId,
        executionId,
        data: { message: `Executando rotina: ${routine.nome}` }
      } as WorkerMessage);

      // Executar rotina
      const result = await routineInstance.execute(routine.configuracao);

      // Atualizar contadores da rotina
      await routine.update({
        total_execucoes: routine.total_execucoes + 1,
        execucoes_com_sucesso: routine.execucoes_com_sucesso + 1,
        ultima_execucao: new Date()
      });

      const duration = Date.now() - startTime;

      // Enviar resultado
      parentPort?.postMessage({
        type: 'complete',
        routineId,
        executionId,
        data: {
          message: 'Rotina executada com sucesso',
          result,
          duration
        }
      } as WorkerMessage);

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Atualizar contadores da rotina em caso de erro
      try {
        const routine = await ScheduledRoutine.findByPk(routineId);
        if (routine) {
          await routine.update({
            total_execucoes: routine.total_execucoes + 1,
            execucoes_com_erro: routine.execucoes_com_erro + 1,
            ultima_execucao: new Date()
          });
        }
      } catch (updateError) {
        console.error('Erro ao atualizar contadores da rotina:', updateError);
      }

      // Enviar erro
      parentPort?.postMessage({
        type: 'error',
        routineId,
        executionId,
        error: error.message,
        data: { duration }
      } as WorkerMessage);
    }
  })();
}

export default SchedulerWorker;
