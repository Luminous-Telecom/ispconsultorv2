import { Router } from 'express';
import { EmpresaController } from '../controllers/sistema/EmpresaController';

const router = Router();

router.get('/', EmpresaController.index);
router.get('/:id', EmpresaController.show);
router.post('/', EmpresaController.store);
router.put('/:id', EmpresaController.update);
router.delete('/:id', EmpresaController.destroy);

export default router;
