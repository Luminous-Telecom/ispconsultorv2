import { Router } from 'express';
import { WebhookController } from '../controllers/WebhookController';
import { ValidateEfiWebhook } from '../middleware/ValidateEfiWebhook';

const router = Router();

// Middleware para validar webhooks da Efí
router.use(ValidateEfiWebhook.validate);

// Rota GET para verificar se o webhook está funcionando
router.get('/efi', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook EFI está funcionando',
    method: 'GET',
    timestamp: new Date().toISOString(),
    note: 'Esta rota é apenas para verificação. O webhook real funciona via POST.'
  });
});

// Webhook unificado para receber notificações da Efí
router.post('/efi', WebhookController.efiWebhook);


export default router;
