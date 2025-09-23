import { Request, Response } from 'express';
export declare class BancoController {
    static list(req: Request, res: Response): Promise<void>;
    static getById(req: Request, res: Response): Promise<void>;
    static create(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static delete(req: Request, res: Response): Promise<void>;
    static findAtivos(req: Request, res: Response): Promise<void>;
    static testarConexao(req: Request, res: Response): Promise<void>;
    static buscarDadosApi(req: Request, res: Response): Promise<void>;
    static urlPadrao(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=BancoController.d.ts.map