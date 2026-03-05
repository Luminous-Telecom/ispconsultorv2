import { Router } from 'express';
import { SaasAuthController } from '../../controllers/saas/SaasAuthController';
import { saasAuthMiddleware } from '../../middleware/saasAuthMiddleware';

const router = Router();

router.post('/login', SaasAuthController.login);
router.post('/logout', SaasAuthController.logout);
router.get('/me', saasAuthMiddleware, SaasAuthController.me);
router.post('/trocar-senha', saasAuthMiddleware, SaasAuthController.trocarSenha);

export default router;
