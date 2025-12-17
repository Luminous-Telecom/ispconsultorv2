import { Router } from 'express';
import { AssinaturaDigitalController } from '../controllers/AssinaturaDigitalController';

const router = Router();

// Webhook - deve vir ANTES das rotas com :id para evitar conflito
router.options('/webhook', AssinaturaDigitalController.webhookOptions);
router.post('/webhook', AssinaturaDigitalController.webhook);

// Rotas para assinatura digital
router.get('/', AssinaturaDigitalController.list);
router.post('/enviar', AssinaturaDigitalController.enviarParaAssinatura);
router.get('/:id', AssinaturaDigitalController.getById);
router.get('/:id/status', AssinaturaDigitalController.consultarStatus);
router.get('/:id/download', AssinaturaDigitalController.baixarPdfAssinado);
router.put('/:id/cancelar', AssinaturaDigitalController.cancelar);

export default router;
