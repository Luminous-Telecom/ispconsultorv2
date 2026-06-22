import { Router } from 'express';
import { AuditoriaController } from '../../controllers/sistema/AuditoriaController';

const router = Router();

router.get('/', AuditoriaController.listOperacional);
router.get('/operacional-list', AuditoriaController.listOperacional);
router.get('/pdf', AuditoriaController.generatePdf);

export default router;
