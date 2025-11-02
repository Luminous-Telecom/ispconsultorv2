import { Router } from 'express';
import { WebhookController } from '../controllers/WebhookController';
import { ValidateEfiWebhook } from '../middleware/ValidateEfiWebhook';
import { WhatsAppFlowController } from '../controllers/WhatsAppFlowController';

const router = Router();

// Rota para WhatsApp Flow (sem validação EFI)
router.post('/whatsapp-flow', WhatsAppFlowController.handleFlow);
router.get('/whatsapp-flow/test', WhatsAppFlowController.test);

// Middleware para validar webhooks da Efí (apenas para rotas EFI)
const efiRouter = Router();
efiRouter.use(ValidateEfiWebhook.validate);

// Rota GET para verificar se o webhook está funcionando
efiRouter.get('/efi', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook EFI está funcionando',
    method: 'GET',
    timestamp: new Date().toISOString(),
    note: 'Esta rota é apenas para verificação. O webhook real funciona via POST.'
  });
});

// Webhook unificado para receber notificações da Efí
efiRouter.post('/efi', WebhookController.efiWebhook);

// Usar o roteador EFI para rotas específicas
router.use('/efi', efiRouter);

export default router;
