import { Router } from 'express';
import { CobrancaPainelController } from '../../controllers/financeiro/CobrancaPainelController';

const router = Router();

router.get('/indicadores', CobrancaPainelController.indicadores);
router.get('/agenda', CobrancaPainelController.agenda);

export default router;
