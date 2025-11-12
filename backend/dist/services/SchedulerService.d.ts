import { ScheduledRoutine, RoutineExecutionLog } from '../models';
import type { JsonValue } from '../types';
interface SchedulerStatus {
    isRunning: boolean;
    activeJobs: number;
    scheduledRoutines: number[];
}
interface WorkersStatus {
    totalWorkers: number;
    activeWorkers: number;
    workers: Array<{
        id: number;
        status: string;
        lastActivity: Date;
    }>;
}
interface HealthStatus {
    status: 'healthy' | 'stopped';
    isRunning: boolean;
    activeJobs: number;
    uptime: number;
}
interface DetailedStats {
    scheduler: {
        isRunning: boolean;
        activeJobs: number;
        uptime: number;
    };
    system: {
        memoryUsage: NodeJS.MemoryUsage;
        cpuUsage: NodeJS.CpuUsage;
        uptime: number;
    };
}
interface RoutineExecutionLogWithRoutine extends RoutineExecutionLog {
    routine?: Pick<ScheduledRoutine, 'nome' | 'tipo'>;
}
export declare class SchedulerService {
    private static instance;
    private cronJobs;
    private isRunning;
    private constructor();
    static getInstance(): SchedulerService;
    start(): Promise<void>;
    stop(): Promise<void>;
    private loadRoutinesFromDatabase;
    scheduleRoutine(routine: ScheduledRoutine): Promise<void>;
    unscheduleRoutine(routineId: number): void;
    private buildCronExpression;
    private runRoutine;
    private executeRoutineByType;
    private executeGeracaoTitulos;
    private executeEnvioBoletos;
    private executeRemessaBancaria;
    createRoutine(data: {
        nome: string;
        tipo: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'verificar_vencimentos' | 'outros';
        descricao?: string;
        configuracao: Record<string, JsonValue>;
        frequencia: 'diaria' | 'semanal' | 'mensal' | 'anual' | 'personalizada';
        dia_execucao?: number;
        hora_execucao: string;
        dia_semana?: number;
        cron_expression?: string;
    }): Promise<ScheduledRoutine>;
    updateRoutine(id: number, data: Partial<ScheduledRoutine>): Promise<ScheduledRoutine>;
    deleteRoutine(id: number): Promise<void>;
    toggleRoutine(id: number, ativo: boolean): Promise<ScheduledRoutine>;
    executeRoutineManually(id: number): Promise<{
        message: string;
    }>;
    private calculateNextExecution;
    getStatus(): SchedulerStatus;
    getAllRoutines(): Promise<ScheduledRoutine[]>;
    getRoutineById(id: number): Promise<ScheduledRoutine | null>;
    getWorkersStatus(): WorkersStatus;
    getHealthStatus(): HealthStatus;
    getDetailedStats(): DetailedStats;
    getExecutionLogs(routineId?: number): Promise<RoutineExecutionLogWithRoutine[]>;
    getRecentExecutionLogs(limit?: number): Promise<RoutineExecutionLogWithRoutine[]>;
}
export default SchedulerService;
//# sourceMappingURL=SchedulerService.d.ts.map