import { Router } from 'express';
import { ParametrosController } from '../../controllers/sistema/ParametrosController';

const router = Router();

router.get('/', ParametrosController.get);
router.put('/', ParametrosController.update);

export default router;

