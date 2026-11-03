import { Router } from 'express';
import { VendedorController } from '../../controllers/cadastros/VendedorController';

const router = Router();

router.get('/', VendedorController.list);
router.get('/ativos', VendedorController.findAtivos);
router.get('/:id', VendedorController.getById);
router.post('/', VendedorController.create);
router.put('/:id', VendedorController.update);
router.delete('/:id', VendedorController.destroy);

export default router;
