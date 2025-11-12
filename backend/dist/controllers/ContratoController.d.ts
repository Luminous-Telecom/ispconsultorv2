import { Request, Response } from 'express';
export declare class ContratoController {
    private static createSchema;
    private static updateSchema;
    static list(req: Request, res: Response): Promise<void>;
    static getByCliente(req: Request, res: Response): Promise<void>;
    static getById(req: Request, res: Response): Promise<void>;
    static create(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static delete(req: Request, res: Response): Promise<void>;
    static getAtivos(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=ContratoController.d.ts.map