import { Request, Response } from 'express';
export declare class CarneController {
    static list(req: Request, res: Response): Promise<void>;
    static getById(req: Request, res: Response): Promise<void>;
    static create(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static delete(req: Request, res: Response): Promise<void>;
    static findAtivos(req: Request, res: Response): Promise<void>;
    static imprimir(req: Request, res: Response): Promise<void>;
    static pdf(req: Request, res: Response): Promise<void>;
    static gerarTitulos(req: Request, res: Response): Promise<void>;
    static consultarStatus(req: Request, res: Response): Promise<void>;
    static cancelarNoBanco(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=CarneController.d.ts.map