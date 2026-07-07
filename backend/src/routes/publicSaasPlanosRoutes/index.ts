import { Router } from 'express';
import { PublicSaasPlanosController } from '../../controllers/public/PublicSaasPlanosController';
import { publicEndpointRateLimitMiddleware } from '../../middleware/rateLimitMiddleware';

const router = Router();

router.get('/saas-planos', publicEndpointRateLimitMiddleware(), PublicSaasPlanosController.listForHotsite);

export default router;
