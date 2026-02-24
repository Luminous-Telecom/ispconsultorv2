import { Router } from 'express';
import { ApiTokenController } from '../../controllers/sistema/ApiTokenController';

const router = Router();

router.get('/', ApiTokenController.index);
router.post('/', ApiTokenController.create);
router.delete('/:id', ApiTokenController.revoke);

export default router;
