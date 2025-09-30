import { Router } from 'express';
import { WebhookController } from '../controllers/WebhookController';
import { ValidateEfiWebhook } from '../middleware/ValidateEfiWebhook';

const router = Router();

// Middleware para validar webhooks da Efí
router.use(ValidateEfiWebhook.validate);

// Webhook unificado para receber notificações da Efí
router.post('/efi', WebhookController.efiWebhook);


export default router;
