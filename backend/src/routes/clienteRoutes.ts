import { Router } from 'express';
import { ClienteController } from '../controllers/ClienteController';

const router = Router();

// Rotas auxiliares (devem vir antes das rotas com parâmetros dinâmicos)
router.get('/buscar-cep/:cep', ClienteController.buscarCep);
router.get('/consultar-cnpj/:cnpj', ClienteController.consultarCnpj);

// Rotas CRUD básicas
router.get('/', ClienteController.index);
router.get('/ativos', ClienteController.findAtivos);
router.get('/cnpj/:cnpj', ClienteController.findByCnpj);
router.get('/:id', ClienteController.show);
router.post('/', ClienteController.store);
router.put('/:id', ClienteController.update);
router.delete('/:id', ClienteController.destroy);

export default router;
