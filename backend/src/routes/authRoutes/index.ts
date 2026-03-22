import { Router } from 'express';
import { AuthController } from '../../controllers/AuthController';
import { authRateLimitMiddleware } from '../../middleware/rateLimitMiddleware';

const router = Router();

router.post('/login', authRateLimitMiddleware(), AuthController.login);
router.get('/me', AuthController.me);
// Retorna o JWT para uso no Socket.IO (lido do cookie HttpOnly)
router.get('/socket-token', AuthController.socketToken);
// Logout limpa o cookie HttpOnly — acessível mesmo sem token válido
router.post('/logout', AuthController.logout);

export default router;

