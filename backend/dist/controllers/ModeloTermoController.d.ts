import { Request, Response } from 'express';
export declare class ModeloTermoController {
    static list(req: Request, res: Response): Promise<void>;
    static getById(req: Request, res: Response): Promise<void>;
    static create(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static delete(req: Request, res: Response): Promise<void>;
    static getByTipo(req: Request, res: Response): Promise<void>;
    static generatePdf(req: Request, res: Response): Promise<void>;
    static generateTestPdf(req: Request, res: Response): Promise<void>;
    static generatePdfWithContrato(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=ModeloTermoController.d.ts.map