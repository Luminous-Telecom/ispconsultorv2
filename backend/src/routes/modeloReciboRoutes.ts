import { Router } from 'express';
import { ModeloReciboController } from '../controllers/ModeloReciboController';

const router = Router();

// Rota para imprimir recibos de múltiplos títulos pagos
router.get('/web/multiplos', ModeloReciboController.imprimirRecibosMultiplos);
router.post('/web/multiplos', ModeloReciboController.imprimirRecibosMultiplos);

export default router;
