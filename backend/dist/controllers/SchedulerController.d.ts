import { Request, Response } from 'express';
export declare class SchedulerController {
    private schedulerService;
    constructor();
    index(req: Request, res: Response): Promise<void>;
    show(req: Request, res: Response): Promise<void>;
    store(req: Request, res: Response): Promise<void>;
    update(req: Request, res: Response): Promise<void>;
    destroy(req: Request, res: Response): Promise<void>;
    toggle(req: Request, res: Response): Promise<void>;
    execute(req: Request, res: Response): Promise<void>;
    status(req: Request, res: Response): Promise<void>;
    getLogs(req: Request, res: Response): Promise<void>;
    getAllLogs(req: Request, res: Response): Promise<void>;
}
export default SchedulerController;
//# sourceMappingURL=SchedulerController.d.ts.map