import { Router } from 'express';
import { PlanoController } from '../../controllers/cadastros/PlanoController';

const router = Router();

// Rotas para planos
router.get('/', PlanoController.list);
// Rotas específicas devem vir antes de rotas com parâmetros
router.get('/ativos', PlanoController.findAtivos);
router.get('/:id', PlanoController.getById);
router.post('/', PlanoController.create);
router.put('/:id', PlanoController.update);
router.patch('/:id/status', PlanoController.toggleStatus);
router.delete('/:id', PlanoController.delete);

export default router;
