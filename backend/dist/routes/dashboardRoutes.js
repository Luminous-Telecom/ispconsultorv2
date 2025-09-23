"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DashboardController_1 = require("../controllers/DashboardController");
const router = (0, express_1.Router)();
router.get('/', DashboardController_1.DashboardController.getDashboardData);
router.get('/stats', DashboardController_1.DashboardController.getStats);
router.get('/carnes-recentes', DashboardController_1.DashboardController.getCarnesRecentes);
router.get('/parcelas-vencidas', DashboardController_1.DashboardController.getParcelasVencidas);
router.get('/parcelas-proximas-vencimento', DashboardController_1.DashboardController.getParcelasProximasVencimento);
router.get('/grafico-carnes-status', DashboardController_1.DashboardController.getGraficoCarnesPorStatus);
router.get('/grafico-clientes-cidade', DashboardController_1.DashboardController.getGraficoClientesPorCidade);
router.get('/resumo-mensal', DashboardController_1.DashboardController.getResumoMensal);
exports.default = router;
//# sourceMappingURL=dashboardRoutes.js.map