import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';

const router = Router();

// Rota principal do dashboard (combina todos os dados)
router.get('/', DashboardController.getDashboardData);

// Estatísticas gerais
router.get('/stats', DashboardController.getStats);

// Dados para gráficos e relatórios
router.get('/carnes-recentes', DashboardController.getCarnesRecentes);
router.get('/parcelas-vencidas', DashboardController.getParcelasVencidas);
router.get('/parcelas-proximas-vencimento', DashboardController.getParcelasProximasVencimento);
router.get('/grafico-carnes-status', DashboardController.getGraficoCarnesPorStatus);
router.get('/grafico-clientes-cidade', DashboardController.getGraficoClientesPorCidade);
router.get('/resumo-mensal', DashboardController.getResumoMensal);

export default router;
