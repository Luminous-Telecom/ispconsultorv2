import { EventEmitter } from 'events';
import { WorkerManager } from './WorkerManager';
export interface MonitorConfig {
    healthCheckInterval?: number;
    logRetentionDays?: number;
    alertThresholds?: {
        maxExecutionTime?: number;
        maxErrorRate?: number;
        maxConsecutiveFailures?: number;
    };
}
export interface HealthStatus {
    status: 'healthy' | 'warning' | 'critical';
    timestamp: Date;
    workers: {
        active: number;
        max: number;
        utilization: number;
    };
    executions: {
        total: number;
        successful: number;
        failed: number;
        successRate: number;
    };
    alerts: string[];
}
interface DailyStats {
    date: string;
    total: number;
    successful: number;
    failed: number;
    avgDuration: number;
}
interface DetailedStats {
    period: {
        days: number;
        startDate: Date;
        endDate: Date;
    };
    totalExecutions: number;
    successRate: number;
    dailyStats: DailyStats[];
    workersStatus: ReturnType<WorkerManager['getStatus']>;
}
export declare class WorkerMonitor extends EventEmitter {
    private static instance;
    private config;
    private isRunning;
    private healthCheckInterval?;
    private workerManager;
    private constructor();
    static getInstance(config?: MonitorConfig): WorkerMonitor;
    start(): Promise<void>;
    stop(): Promise<void>;
    private performHealthCheck;
    getHealthStatus(): Promise<HealthStatus>;
    private checkForAlerts;
    private scheduleLogCleanup;
    private cleanupOldLogs;
    getDetailedStats(days?: number): Promise<DetailedStats>;
    getConfig(): Required<MonitorConfig>;
    updateConfig(newConfig: Partial<MonitorConfig>): void;
}
export default WorkerMonitor;
//# sourceMappingURL=WorkerMonitor.d.ts.map