import { Router } from 'express';
import { UsuarioController } from '../../controllers/cadastros/UsuarioController';

const router = Router();

router.get('/', UsuarioController.list);
router.get('/:id', UsuarioController.getById);
router.post('/', UsuarioController.create);
router.put('/:id', UsuarioController.update);
router.delete('/:id', UsuarioController.delete);
router.post('/:id/gerar-webhook-secret', UsuarioController.gerarWebhookSecret);
router.post('/:id/reset-2fa', UsuarioController.reset2fa);

export default router;

