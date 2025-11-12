import { Request, Response } from 'express';
export declare class ServidorWhatsAppController {
    static list(req: Request, res: Response): Promise<void>;
    static show(req: Request, res: Response): Promise<void>;
    static create(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static delete(req: Request, res: Response): Promise<void>;
    static testConnection(req: Request, res: Response): Promise<void>;
    static getActive(req: Request, res: Response): Promise<void>;
    static createOrUpdate(req: Request, res: Response): Promise<void>;
    static connectInstance(req: Request, res: Response): Promise<void>;
    static sendTestMessage(req: Request, res: Response): Promise<void>;
    static getMensagemByTipo(req: Request, res: Response): Promise<void>;
    static saveMensagem(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=ServidorWhatsAppController.d.ts.map