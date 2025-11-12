import { Request, Response } from 'express';
import { Titulo } from '../models/Titulo';
import { Cliente } from '../models/Cliente';
import { Contrato } from '../models/Contrato';
import { Plano } from '../models/Plano';
import { Banco } from '../models/Banco';
interface TituloComRelacoes extends Titulo {
    cliente?: Cliente & {
        nome?: string;
        cpf?: string;
        cnpj?: string;
    };
    banco?: Banco & {
        logo?: string;
        agencia_codigo?: string;
    };
    contrato?: Contrato;
    plano?: Plano;
}
export declare class TituloController {
    static gerarPdfBase64(titulo: TituloComRelacoes): Promise<string | null>;
    private static processarBoletoHtml;
    private static converterLogoParaBase64;
    private static getLogoBancoPadrao;
    private static processarInstrucao;
    static list(req: Request, res: Response): Promise<void>;
    static show(req: Request, res: Response): Promise<void>;
    static create(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static destroy(req: Request, res: Response): Promise<void>;
    static imprimirBoleto(req: Request, res: Response): Promise<void>;
    static imprimirBoletosMultiplos(req: Request, res: Response): Promise<void>;
    static gerarPdfBoletosMultiplos(req: Request, res: Response): Promise<void>;
    static marcarComoPago(req: Request, res: Response): Promise<void>;
    static desmarcarPago(req: Request, res: Response): Promise<void>;
    static consultarRecebimento(req: Request, res: Response): Promise<void>;
    static estornar(req: Request, res: Response): Promise<void>;
    static getByContrato(req: Request, res: Response): Promise<void>;
    static getStats(req: Request, res: Response): Promise<void>;
}
export {};
//# sourceMappingURL=TituloController.d.ts.map