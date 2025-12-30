import { Router } from 'express';
import { ModeloReciboController } from '../controllers/ModeloReciboController';

const router = Router();

// Rotas para recibos
router.get('/', ModeloReciboController.list);
router.post('/', ModeloReciboController.create);

// Rotas para variáveis
router.get('/variaveis/disponiveis', ModeloReciboController.listarVariaveis);

// Rota para imprimir recibos de múltiplos títulos pagos (DEVE VIR ANTES da rota com :id)
router.get('/web/multiplos', ModeloReciboController.imprimirRecibosMultiplos);
router.post('/web/multiplos', ModeloReciboController.imprimirRecibosMultiplos);

// Rotas para PDFs
router.get('/:id/pdf', ModeloReciboController.generatePdf);
router.get('/:id/pdf-teste', ModeloReciboController.generateTestPdf);

// Rotas CRUD por ID
router.get('/:id', ModeloReciboController.show);
router.put('/:id', ModeloReciboController.update);
router.delete('/:id', ModeloReciboController.delete);

export default router;
