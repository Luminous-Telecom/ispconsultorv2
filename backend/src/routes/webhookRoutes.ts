import { Router } from 'express';
import { WebhookController } from '../controllers/WebhookController';
import { ValidateEfiWebhook } from '../middleware/ValidateEfiWebhook';
import { IntegrationWebhookController } from '../controllers/IntegrationWebhookController';

const router = Router();

// Middleware para validar webhooks da Efí (apenas para rotas EFI)
const efiRouter = Router();
efiRouter.use(ValidateEfiWebhook.validate);

// Rota GET para verificar se o webhook está funcionando
efiRouter.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook EFI está funcionando',
    method: 'GET',
    timestamp: new Date().toISOString(),
    note: 'Esta rota é apenas para verificação. O webhook real funciona via POST.'
  });
});

// Webhook unificado para receber notificações da Efí
efiRouter.post('/', WebhookController.efiWebhook);

// Usar o roteador EFI para rotas específicas
router.use('/efi', efiRouter);

// Webhook do Asaas
const asaasRouter = Router();
asaasRouter.post('/', WebhookController.asaasWebhook);
router.use('/asaas', asaasRouter);

// Webhook interno para integrações personalizadas
router.post('/integration', IntegrationWebhookController.handleIntegration);

export default router;
