import { Router } from 'express';
import { EfiWebhookController } from '../../controllers/webhooks/EfiWebhookController';
import { AsaasWebhookController } from '../../controllers/webhooks/AsaasWebhookController';
import { ValidateEfiWebhook } from '../../middleware/ValidateEfiWebhook';

const router = Router();

// Middleware para validar webhooks da Efí (apenas para rotas EFI)
const efiRouter = Router();
efiRouter.use(ValidateEfiWebhook.validate);

// Webhook unificado para receber notificações da Efí
efiRouter.post('/', EfiWebhookController.handle);

// Usar o roteador EFI para rotas específicas
router.use('/efi', efiRouter);

// Webhook do Asaas (pagamentos e NFS-e)
const asaasRouter = Router();
asaasRouter.post('/', AsaasWebhookController.handle);
router.use('/asaas', asaasRouter);

export default router;
