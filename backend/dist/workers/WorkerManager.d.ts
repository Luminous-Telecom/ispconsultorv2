import { EventEmitter } from 'events';
import ScheduledRoutine from '../models/ScheduledRoutine';
export interface WorkerManagerConfig {
    maxWorkers?: number;
    checkInterval?: number;
    retryAttempts?: number;
    retryDelay?: number;
}
interface WorkerInfo {
    executionId: number;
    threadId: number | undefined;
    isRunning: boolean;
}
export interface WorkersStatus {
    active: number;
    max: number;
    workers: WorkerInfo[];
}
export declare class WorkerManager extends EventEmitter {
    private static instance;
    private config;
    private isRunning;
    private checkInterval?;
    private activeExecutions;
    private constructor();
    static getInstance(config?: WorkerManagerConfig): WorkerManager;
    start(): Promise<void>;
    stop(): Promise<void>;
    private processScheduledRoutines;
    private processPendingRoutines;
    executeRoutine(routine: ScheduledRoutine): Promise<void>;
    private executeWithRetry;
    private updateNextExecution;
    executeRoutineManually(routineId: number): Promise<void>;
    getStatus(): {
        isRunning: boolean;
        activeExecutions: number;
        workersStatus: WorkersStatus;
        config: Required<WorkerManagerConfig>;
    };
    private delay;
}
export default WorkerManager;
//# sourceMappingURL=WorkerManager.d.ts.map