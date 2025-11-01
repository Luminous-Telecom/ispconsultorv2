import { Router } from 'express';
import { ModeloTermoController } from '../controllers/ModeloTermoController';

const router = Router();

router.get('/', ModeloTermoController.list);
router.post('/', ModeloTermoController.create);

// Rotas específicas
router.get('/tipo/:tipo', ModeloTermoController.getByTipo);

// Rotas para PDFs
router.post('/:id/pdf/contrato/:contratoId', ModeloTermoController.generatePdfWithContrato);
router.get('/:id/pdf', ModeloTermoController.generatePdf);
router.post('/:id/pdf/test', ModeloTermoController.generateTestPdf);

// Rotas CRUD por ID
router.get('/:id', ModeloTermoController.getById);
router.put('/:id', ModeloTermoController.update);
router.delete('/:id', ModeloTermoController.delete);

export default router;
