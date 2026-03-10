import { Router } from 'express';
import { TenantBoletoAtrasoController } from '../../controllers/tenant/TenantBoletoAtrasoController';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = Router();

router.post('/boleto-atraso', authMiddleware, TenantBoletoAtrasoController.post);
router.get('/boleto-atraso-pdf', authMiddleware, TenantBoletoAtrasoController.getPdf);

export default router;
