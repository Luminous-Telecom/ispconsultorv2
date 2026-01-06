import { Router } from 'express';
import { DashboardController } from '../../controllers/sistema/DashboardController';

const router = Router();

// Rota principal do dashboard (combina todos os dados)
router.get('/', DashboardController.getDashboardData);

// Estatísticas gerais
router.get('/stats', DashboardController.getStats);

// Dados para gráficos e relatórios
router.get('/titulos-recentes', DashboardController.getTitulosRecentes);
router.get('/titulos-vencidos', DashboardController.getTitulosVencidos);
router.get('/titulos-proximos-vencimento', DashboardController.getTitulosProximosVencimento);
router.get('/grafico-titulos-status', DashboardController.getGraficoTitulosPorStatus);
router.get('/grafico-clientes-cidade', DashboardController.getGraficoClientesPorCidade);
router.get('/resumo-mensal', DashboardController.getResumoMensal);

export default router;
