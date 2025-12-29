import { Router } from 'express';
import { FornecedorController } from '../controllers/FornecedorController';

const router = Router();

// Rotas CRUD básicas
router.get('/', FornecedorController.index);
router.get('/consultar-cnpj/:cnpj', FornecedorController.consultarCnpj);
router.get('/:id', FornecedorController.show);
router.post('/', FornecedorController.store);
router.put('/:id', FornecedorController.update);
router.delete('/:id', FornecedorController.destroy);

export default router;

