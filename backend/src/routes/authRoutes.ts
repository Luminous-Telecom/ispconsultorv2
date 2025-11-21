import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authRateLimitMiddleware } from '../middleware/rateLimitMiddleware';

const router = Router();

// Aplicar rate limiting mais restritivo na rota de login
// Previne ataques de força bruta
router.post('/login', authRateLimitMiddleware(), AuthController.login);
router.get('/me', AuthController.me);

export default router;

