import { Router } from 'express';
import { EfiWebhookController } from '../controllers/webhooks/EfiWebhookController';
import { AsaasWebhookController } from '../controllers/webhooks/AsaasWebhookController';
import { ValidateEfiWebhook } from '../middleware/ValidateEfiWebhook';
import { IntegrationWebhookController } from '../controllers/IntegrationWebhookController';

const router = Router();

// Middleware para validar webhooks da Efí (apenas para rotas EFI)
const efiRouter = Router();
efiRouter.use(ValidateEfiWebhook.validate);

// Webhook unificado para receber notificações da Efí
efiRouter.post('/', EfiWebhookController.handle);

// Usar o roteador EFI para rotas específicas
router.use('/efi', efiRouter);

// Webhook do Asaas
const asaasRouter = Router();
asaasRouter.post('/', AsaasWebhookController.handle);
router.use('/asaas', asaasRouter);

// Webhook interno para integrações personalizadas
router.post('/integration', IntegrationWebhookController.handleIntegration);

// Rota para servir PDF temporário gerado pelo webhook
router.get('/integration/pdf/:token', IntegrationWebhookController.servePdf);

export default router;
