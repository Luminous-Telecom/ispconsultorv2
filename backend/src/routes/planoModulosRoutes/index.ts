import { Router } from 'express';
import * as PlanoModulosController from '../../controllers/sistema/PlanoModulosController';

const router = Router();
router.get('/', PlanoModulosController.getModulos);

export default router;
