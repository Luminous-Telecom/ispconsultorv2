import { Router } from 'express';
import { DominioController } from '../../controllers/blockdomi/DominioController';

const router = Router();

// Rotas para domínios
router.get('/', DominioController.list);
router.get('/:id', DominioController.getById);
router.post('/bulk', DominioController.bulkCreate);
router.post('/', DominioController.create);
router.put('/:id', DominioController.update);
router.delete('/:id', DominioController.delete);

export default router;
