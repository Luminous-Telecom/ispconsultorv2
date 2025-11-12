import { Request, Response } from 'express';
export declare class WorkerController {
    static getStatus(req: Request, res: Response): Promise<void>;
    static getHealth(req: Request, res: Response): Promise<void>;
    static getStats(req: Request, res: Response): Promise<void>;
    static executeRoutine(req: Request, res: Response): Promise<void>;
    static getExecutionLogs(req: Request, res: Response): Promise<void>;
    static getRecentLogs(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=WorkerController.d.ts.map