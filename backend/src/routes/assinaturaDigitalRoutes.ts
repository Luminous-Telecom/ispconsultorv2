import { Router, Request, Response, NextFunction } from 'express';
import { AssinaturaDigitalController } from '../controllers/AssinaturaDigitalController';
import { AssinaturaDigitalControllerAssinafy } from '../controllers/AssinaturaDigitalControllerAssinafy';
import { AssinaturaDigitalControllerZapsign } from '../controllers/AssinaturaDigitalControllerZapsign';
import { logger } from '../utils/logger';

const router = Router();


// ============================================
// ROTAS ESPECÍFICAS POR PROVIDER
// ============================================

// ========== ASSINAFY ==========
router.options('/webhook/assinafy', AssinaturaDigitalController.webhookOptions);
router.post('/webhook/assinafy', AssinaturaDigitalController.webhookAssinafy);
router.post('/assinafy/enviar', AssinaturaDigitalControllerAssinafy.enviarParaAssinatura);
router.get('/assinafy/:id/status', AssinaturaDigitalControllerAssinafy.consultarStatus);
router.get('/assinafy/:id/download', AssinaturaDigitalControllerAssinafy.baixarPdfAssinado);
router.put('/assinafy/:id/cancelar', AssinaturaDigitalControllerAssinafy.cancelar);

// ========== ZAPSIGN ==========
router.options('/webhook/zapsign', AssinaturaDigitalController.webhookOptions);
router.post('/webhook/zapsign', AssinaturaDigitalController.webhookZapsign);

// Rotas ZAPSIGN (específicas)
router.post('/zapsign/enviar', AssinaturaDigitalControllerZapsign.enviarParaAssinatura);
router.get('/zapsign/:id/status', AssinaturaDigitalControllerZapsign.consultarStatus);
router.get('/zapsign/:id/download', AssinaturaDigitalControllerZapsign.baixarPdfAssinado);
router.put('/zapsign/:id/cancelar', AssinaturaDigitalControllerZapsign.cancelar);

// ============================================
// ROTAS GENÉRICAS (compatibilidade com frontend)
// ============================================
router.get('/', AssinaturaDigitalController.list);
router.get('/:id', AssinaturaDigitalController.getById);
router.post('/enviar', AssinaturaDigitalController.enviarParaAssinatura);
router.get('/:id/status', AssinaturaDigitalController.consultarStatus);
router.get('/:id/download', AssinaturaDigitalController.baixarPdfAssinado);
router.put('/:id/cancelar', AssinaturaDigitalController.cancelar);

export default router;
