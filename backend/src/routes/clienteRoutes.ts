import { Router } from 'express';
import { ClienteController } from '../controllers/ClienteController';

const router = Router();

// Rotas CRUD básicas
router.get('/', ClienteController.index);
router.get('/ativos', ClienteController.findAtivos);
router.get('/cnpj/:cnpj', ClienteController.findByCnpj);
router.get('/:id', ClienteController.show);
router.post('/', ClienteController.store);
router.put('/:id', ClienteController.update);
router.delete('/:id', ClienteController.destroy);

// Rotas auxiliares
router.get('/api/buscar-cep/:cep', ClienteController.buscarCep);

export default router;
