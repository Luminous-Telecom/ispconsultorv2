import { Router } from 'express';
import { SaasServidorEmailController, SaasServidorWhatsappController, SaasBancoController } from '../../controllers/saas/SaasConfigController';
import { saasAuthMiddleware } from '../../middleware/saasAuthMiddleware';

const router = Router();
router.use(saasAuthMiddleware);

// Servidores Email
router.get('/servidores-email', SaasServidorEmailController.list);
router.get('/servidores-email/:id', SaasServidorEmailController.getById);
router.post('/servidores-email', SaasServidorEmailController.create);
router.put('/servidores-email/:id', SaasServidorEmailController.update);
router.delete('/servidores-email/:id', SaasServidorEmailController.delete);

// Servidores WhatsApp
router.get('/servidores-whatsapp', SaasServidorWhatsappController.list);
router.get('/servidores-whatsapp/:id', SaasServidorWhatsappController.getById);
router.post('/servidores-whatsapp', SaasServidorWhatsappController.create);
router.put('/servidores-whatsapp/:id', SaasServidorWhatsappController.update);
router.delete('/servidores-whatsapp/:id', SaasServidorWhatsappController.delete);

// Bancos
router.get('/bancos', SaasBancoController.list);
router.get('/bancos/:id', SaasBancoController.getById);
router.post('/bancos', SaasBancoController.create);
router.put('/bancos/:id', SaasBancoController.update);
router.delete('/bancos/:id', SaasBancoController.delete);
router.post('/bancos/:id/testar-conexao', SaasBancoController.testarConexao);
router.post('/bancos/:id/gerar-webhook-secret', SaasBancoController.gerarWebhookSecret);

export default router;
