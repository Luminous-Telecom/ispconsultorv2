import { Request, Response } from 'express';
export declare class TermoContratoController {
    static getByContrato(req: Request, res: Response): Promise<void>;
    static getById(req: Request, res: Response): Promise<void>;
    static create(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static marcarComoAceito(req: Request, res: Response): Promise<void>;
    static deactivate(req: Request, res: Response): Promise<void>;
    static delete(req: Request, res: Response): Promise<void>;
    static getAtivos(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=TermoContratoController.d.ts.map