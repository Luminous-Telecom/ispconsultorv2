import { Router } from 'express';
import { ModeloTermoController } from '../../controllers/documentos/ModeloTermoController';

const router = Router();

router.get('/', ModeloTermoController.list);
router.get('/tipo/:tipo', ModeloTermoController.getByTipo);
router.post('/', ModeloTermoController.create);

router.get('/:id/pdf', ModeloTermoController.generatePdf);
router.post('/:id/pdf/test', ModeloTermoController.generateTestPdf);
router.post('/:id/pdf/contrato/:contratoId', ModeloTermoController.generatePdfWithContrato);

router.get('/:id', ModeloTermoController.getById);
router.put('/:id', ModeloTermoController.update);
router.delete('/:id', ModeloTermoController.delete);

export default router;
