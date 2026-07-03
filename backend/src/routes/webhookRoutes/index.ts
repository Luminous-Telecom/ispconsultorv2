import { Router } from 'express';
import { EfiWebhookController } from '../../controllers/webhooks/EfiWebhookController';
import { AsaasWebhookController } from '../../controllers/webhooks/AsaasWebhookController';
import { ValidateEfiWebhook } from '../../middleware/ValidateEfiWebhook';

const router = Router();

// Middleware para validar webhooks da Efí (apenas para rotas EFI)
const efiRouter = Router();
efiRouter.use(ValidateEfiWebhook.validate);

// Webhook Efí: /webhook/efi (retrocompatível) e /webhook/efi/:empresaIdentifier (ex: /saas ou ID do banco)
efiRouter.post('/', EfiWebhookController.handle);
efiRouter.post('/:empresaIdentifier', EfiWebhookController.handle);

router.use('/efi', efiRouter);

// Webhook Asaas: /webhook/asaas (retrocompatível) e /webhook/asaas/:empresaIdentifier (ex: /saas ou ID do banco)
const asaasRouter = Router();
asaasRouter.post('/', AsaasWebhookController.handle);
asaasRouter.post('/:empresaIdentifier', AsaasWebhookController.handle);
router.use('/asaas', asaasRouter);

export default router;
