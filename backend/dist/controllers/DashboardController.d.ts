import { Request, Response } from 'express';
export declare class DashboardController {
    static getDashboardData(req: Request, res: Response): Promise<void>;
    private static getStatsData;
    private static getCarnesRecentesData;
    private static getParcelasVencidasData;
    static getStats(req: Request, res: Response): Promise<void>;
    static getCarnesRecentes(req: Request, res: Response): Promise<void>;
    static getParcelasVencidas(req: Request, res: Response): Promise<void>;
    static getParcelasProximasVencimento(req: Request, res: Response): Promise<void>;
    static getGraficoCarnesPorStatus(req: Request, res: Response): Promise<void>;
    static getGraficoClientesPorCidade(req: Request, res: Response): Promise<void>;
    static getResumoMensal(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=DashboardController.d.ts.map