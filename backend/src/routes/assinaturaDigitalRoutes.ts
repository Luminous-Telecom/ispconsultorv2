import { Router } from 'express';
import { AssinaturaDigitalController } from '../controllers/AssinaturaDigitalController';

const router = Router();

// Webhooks
router.options('/webhook/assinafy', AssinaturaDigitalController.webhookOptions);
router.post('/webhook/assinafy', AssinaturaDigitalController.webhookAssinafy);
router.options('/webhook/zapsign', AssinaturaDigitalController.webhookOptions);
router.post('/webhook/zapsign', AssinaturaDigitalController.webhookZapsign);

// Rotas genéricas (detecta provider automaticamente)
router.get('/', AssinaturaDigitalController.list);
router.get('/:id', AssinaturaDigitalController.getById);
router.post('/enviar', AssinaturaDigitalController.enviarParaAssinatura);
router.get('/:id/status', AssinaturaDigitalController.consultarStatus);
router.get('/:id/download', AssinaturaDigitalController.baixarPdfAssinado);
router.put('/:id/cancelar', AssinaturaDigitalController.cancelar);

export default router;
