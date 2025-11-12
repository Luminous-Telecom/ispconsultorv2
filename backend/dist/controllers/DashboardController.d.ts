import { Request, Response } from 'express';
export declare class DashboardController {
    static getDashboardData(req: Request, res: Response): Promise<void>;
    private static getStatsData;
    private static getTitulosRecentesData;
    private static getTitulosVencidosData;
    static getStats(req: Request, res: Response): Promise<void>;
    static getTitulosRecentes(req: Request, res: Response): Promise<void>;
    static getTitulosVencidos(req: Request, res: Response): Promise<void>;
    static getTitulosProximosVencimento(req: Request, res: Response): Promise<void>;
    static getGraficoTitulosPorStatus(req: Request, res: Response): Promise<void>;
    static getGraficoClientesPorCidade(req: Request, res: Response): Promise<void>;
    static getResumoMensal(req: Request, res: Response): Promise<void>;
    private static parseStartDate;
    private static parseEndDate;
    private static getReceberPorPeriodoData;
    private static getRecebidosPorPeriodoData;
    private static getResumoFinanceiroPeriodo;
    private static getReceitaUltimos12Meses;
}
//# sourceMappingURL=DashboardController.d.ts.map