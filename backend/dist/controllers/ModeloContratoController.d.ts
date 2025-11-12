import { Request, Response } from 'express';
export declare class ModeloContratoController {
    static list(req: Request, res: Response): Promise<void>;
    static show(req: Request, res: Response): Promise<void>;
    static create(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static delete(req: Request, res: Response): Promise<void>;
    static getByType(req: Request, res: Response): Promise<void>;
    static getDefaultByType(req: Request, res: Response): Promise<void>;
    static getTypes(req: Request, res: Response): Promise<void>;
    static convertWordToHtml(req: Request, res: Response): Promise<void>;
    static generatePdf(req: Request, res: Response): Promise<void>;
    static generateTestPdf(req: Request, res: Response): Promise<void>;
    static listarVariaveis(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=ModeloContratoController.d.ts.map