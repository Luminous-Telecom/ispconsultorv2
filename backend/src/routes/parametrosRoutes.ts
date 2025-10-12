import { Router } from 'express';
import { ParametrosController } from '../controllers/ParametrosController';

const router = Router();

router.get('/', ParametrosController.get);
router.put('/', ParametrosController.update);

export default router;

