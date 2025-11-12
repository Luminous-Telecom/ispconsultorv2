import type { WorkersStatus } from './WorkerManager';
type JsonValue = string | number | boolean | null | JsonValue[] | {
    [key: string]: JsonValue;
};
interface StatusMessageData {
    message: string;
    last_update?: string;
    duration?: number;
}
interface CompleteMessageData {
    message: string;
    result?: Record<string, JsonValue>;
    duration: number;
    completed_at?: string;
}
interface ErrorMessageData {
    duration?: number;
    error?: string;
    error_data?: Record<string, JsonValue>;
    failed_at?: string;
}
type WorkerMessageData = StatusMessageData | CompleteMessageData | ErrorMessageData;
export interface WorkerMessage {
    type: 'execute' | 'status' | 'error' | 'complete';
    data?: WorkerMessageData;
    error?: string;
    routineId?: number;
    executionId?: number;
}
export interface WorkerData {
    routineId: number;
    routineData: Record<string, JsonValue>;
    executionId: number;
}
declare class SchedulerWorker {
    private static workers;
    private static maxWorkers;
    private static activeWorkers;
    static executeRoutine(routineId: number, routineData: Record<string, JsonValue>): Promise<number>;
    private static handleWorkerMessage;
    private static logExecutionError;
    private static cleanupWorker;
    static getWorkersStatus(): WorkersStatus;
    static stopAllWorkers(): Promise<void>;
}
export default SchedulerWorker;
//# sourceMappingURL=SchedulerWorker.d.ts.map