import { Router } from 'express';
import { ModeloTermoController } from '../../controllers/contratos/ModeloTermoController';

const router = Router();

router.get('/', ModeloTermoController.list);
router.post('/', ModeloTermoController.create);

// Rotas específicas (devem vir antes das rotas com parâmetros dinâmicos)
router.get('/tipo/:tipo', ModeloTermoController.getByTipo);

// Rotas para PDFs (devem vir antes das rotas CRUD por ID)
router.post('/:id/pdf/contrato/:contratoId', ModeloTermoController.generatePdfWithContrato);
router.get('/:id/pdf', ModeloTermoController.generatePdf);
router.post('/:id/pdf/test', ModeloTermoController.generateTestPdf);

// Rotas CRUD por ID (devem vir por último)
router.get('/:id', ModeloTermoController.getById);
router.put('/:id', ModeloTermoController.update);
router.delete('/:id', ModeloTermoController.delete);

export default router;
