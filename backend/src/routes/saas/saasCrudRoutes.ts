import { Router } from 'express';
import {
  SaasTipoCobrancaController,
  SaasDiasVencimentoController,
  SaasTituloController,
  SaasContratoController,
} from '../../controllers/saas/SaasCrudController';
import { SaasTenantUsuarioController } from '../../controllers/saas/SaasTenantUsuarioController';
import { SaasDashboardController } from '../../controllers/saas/SaasDashboardController';
import { SaasAuditoriaController } from '../../controllers/saas/SaasAuditoriaController';
import { saasAuthMiddleware } from '../../middleware/saasAuthMiddleware';

const router = Router();
router.use(saasAuthMiddleware);

// Dashboard
router.get('/dashboard', SaasDashboardController.getDashboardData);
router.get('/server-stats', SaasDashboardController.getServerStats);

// Auditoria (logs do painel SaaS — empresa_id opcional para ver todos)
router.get('/auditoria/pdf', SaasAuditoriaController.generatePdf);
router.get('/auditoria', SaasAuditoriaController.listByTenant);

// Tipos de Cobrança
router.get('/tipos-cobranca', SaasTipoCobrancaController.list);
router.get('/tipos-cobranca/:id', SaasTipoCobrancaController.getById);
router.post('/tipos-cobranca', SaasTipoCobrancaController.create);
router.put('/tipos-cobranca/:id', SaasTipoCobrancaController.update);
router.delete('/tipos-cobranca/:id', SaasTipoCobrancaController.delete);

// Dias de Vencimento (config no formato admin - get/update)
router.get('/dias-vencimento/config', SaasDiasVencimentoController.getConfig);
router.put('/dias-vencimento/config', SaasDiasVencimentoController.updateConfig);
router.get('/dias-vencimento', SaasDiasVencimentoController.list);
router.get('/dias-vencimento/:id', SaasDiasVencimentoController.getById);
router.post('/dias-vencimento', SaasDiasVencimentoController.create);
router.put('/dias-vencimento/:id', SaasDiasVencimentoController.update);
router.delete('/dias-vencimento/:id', SaasDiasVencimentoController.delete);

// Contratos
router.get('/contratos', SaasContratoController.list);
router.get('/contratos/:id', SaasContratoController.getById);
router.post('/contratos', SaasContratoController.create);
router.put('/contratos/:id', SaasContratoController.update);
router.delete('/contratos/:id', SaasContratoController.delete);

// Títulos (Contas a Receber)
router.get('/titulos/resumo', SaasTituloController.resumo);
router.get('/titulos/boletos-multiplos-pdf', SaasTituloController.gerarPdfBoletosMultiplos);
router.get('/titulos', SaasTituloController.list);
router.get('/titulos/:id', SaasTituloController.getById);
router.post('/titulos', SaasTituloController.create);
router.put('/titulos/:id', SaasTituloController.update);
router.delete('/titulos/:id', SaasTituloController.delete);
router.post('/titulos/:id/pagar', SaasTituloController.marcarPago);
router.post('/titulos/:id/gerar-boleto', SaasTituloController.gerarBoleto);

// Usuários do tenant (adm_usuarios por empresa_id)
router.get('/tenant-usuarios', SaasTenantUsuarioController.list);
router.get('/tenant-usuarios/:id', SaasTenantUsuarioController.getById);
router.post('/tenant-usuarios', SaasTenantUsuarioController.create);
router.put('/tenant-usuarios/:id', SaasTenantUsuarioController.update);
router.delete('/tenant-usuarios/:id', SaasTenantUsuarioController.delete);

export default router;
