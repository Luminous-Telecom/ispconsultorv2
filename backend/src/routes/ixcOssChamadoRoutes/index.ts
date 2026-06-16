import { Router } from 'express';
import { IxcOssChamadoController } from '../../controllers/ixc/IxcOssChamadoController';

const router = Router();

router.get('/', IxcOssChamadoController.list);
router.get('/:id', IxcOssChamadoController.getById);
router.post('/', IxcOssChamadoController.create);
router.put('/:id', IxcOssChamadoController.update);
router.post('/:id/acoes/:acao', IxcOssChamadoController.executeAcao);
router.delete('/:id', IxcOssChamadoController.delete);

export default router;
