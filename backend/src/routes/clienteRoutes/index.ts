import { Router } from 'express';
import { ClienteController } from '../../controllers/clientes/ClienteController';
import { publicEndpointRateLimitMiddleware } from '../../middleware/rateLimitMiddleware';

const router = Router();

// Rotas auxiliares — rate limit 20 req/IP/min (endpoints públicos sem autenticação)
router.get('/buscar-cep/:cep', publicEndpointRateLimitMiddleware(), ClienteController.buscarCep);
router.get('/consultar-cnpj/:cnpj', publicEndpointRateLimitMiddleware(), ClienteController.consultarCnpj);

// Rotas CRUD básicas
router.get('/', ClienteController.index);
router.get('/ativos', ClienteController.findAtivos);
router.get('/cnpj/:cnpj', ClienteController.findByCnpj);
router.get('/:id', ClienteController.show);
router.post('/', ClienteController.store);
router.put('/:id', ClienteController.update);
router.delete('/:id', ClienteController.destroy);

export default router;
