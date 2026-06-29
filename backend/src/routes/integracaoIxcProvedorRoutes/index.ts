import { Router } from 'express';
import { IntegracaoIxcProvedorController } from '../../controllers/integracao/IntegracaoIxcProvedorController';

const router = Router();

router.get('/sync-logs', IntegracaoIxcProvedorController.listSyncLogs);
router.post('/sync-ordens-servico', IntegracaoIxcProvedorController.syncOrdensServico);
router.get('/', IntegracaoIxcProvedorController.list);
router.get('/ativos', IntegracaoIxcProvedorController.findAtivos);
router.post('/test', IntegracaoIxcProvedorController.testConnectionWithCredentials);
router.get('/:id', IntegracaoIxcProvedorController.getById);
router.post('/:id/test', IntegracaoIxcProvedorController.testConnection);
router.get('/:id/check-permissions/:resourceId/dados', IntegracaoIxcProvedorController.checkPermissionsDados);
router.post('/:id/check-permissions', IntegracaoIxcProvedorController.checkPermissions);
router.post('/:id/sync-ordem-servico-cadastros', IntegracaoIxcProvedorController.syncOrdemServicoCadastros);
router.post('/', IntegracaoIxcProvedorController.create);
router.put('/:id', IntegracaoIxcProvedorController.update);
router.delete('/:id', IntegracaoIxcProvedorController.destroy);

export default router;
