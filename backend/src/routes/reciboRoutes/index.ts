import { Router } from 'express';
import { TituloReciboController } from '../../controllers/titulos/TituloReciboController';

const router = Router();

router.post('/web/multiplos', TituloReciboController.imprimirRecibosMultiplos);
router.get('/web/multiplos', TituloReciboController.imprimirRecibosMultiplos);

export default router;
