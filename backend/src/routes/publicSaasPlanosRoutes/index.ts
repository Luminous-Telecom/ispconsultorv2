import { Router } from 'express';
import { PublicSaasPlanosController } from '../../controllers/public/PublicSaasPlanosController';

const router = Router();

router.get('/saas-planos', PublicSaasPlanosController.listForHotsite);

export default router;
