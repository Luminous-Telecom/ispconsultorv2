import { Router } from 'express';
import { ModeloReciboController } from '../controllers/ModeloReciboController';

const router = Router();

// Rotas para recibos
router.get('/', ModeloReciboController.list);
router.get('/:id', ModeloReciboController.show);
router.post('/', ModeloReciboController.create);
router.put('/:id', ModeloReciboController.update);
router.delete('/:id', ModeloReciboController.delete);

// Rotas para PDFs
router.get('/:id/pdf', ModeloReciboController.generatePdf);
router.get('/:id/pdf-teste', ModeloReciboController.generateTestPdf);

// Rotas para variáveis
router.get('/variaveis/disponiveis', ModeloReciboController.listarVariaveis);

export default router;
