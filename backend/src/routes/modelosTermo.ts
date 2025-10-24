import { Router } from 'express';
import { ModeloTermoController } from '../controllers/ModeloTermoController';

const router = Router();

router.get('/', ModeloTermoController.list);
router.get('/tipo/:tipo', ModeloTermoController.getByTipo);
router.get('/:id', ModeloTermoController.getById);
router.post('/', ModeloTermoController.create);
router.put('/:id', ModeloTermoController.update);
router.delete('/:id', ModeloTermoController.delete);
router.post('/:id/pdf/contrato/:contratoId', ModeloTermoController.generatePdfWithContrato);
router.get('/:id/pdf', ModeloTermoController.generatePdf);
router.post('/:id/pdf/test', ModeloTermoController.generateTestPdf);

export default router;
