import { Request, Response } from 'express';
export declare class ClienteController {
    private static createSchema;
    private static updateSchema;
    static index(req: Request, res: Response): Promise<void>;
    static show(req: Request, res: Response): Promise<void>;
    static store(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static destroy(req: Request, res: Response): Promise<void>;
    static findByCnpj(req: Request, res: Response): Promise<void>;
    static findAtivos(req: Request, res: Response): Promise<void>;
    static buscarCep(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=ClienteController.d.ts.map