import { Router } from 'express';
import { IPv6Controller } from '../../controllers/blockdomi/IPv6Controller';

const router = Router();

// Rotas para IPv6
router.get('/', IPv6Controller.list);
router.get('/:id', IPv6Controller.getById);
router.post('/bulk', IPv6Controller.bulkCreate);
router.post('/bulk-delete', IPv6Controller.bulkDelete);
router.post('/', IPv6Controller.create);
router.put('/:id', IPv6Controller.update);
router.delete('/:id', IPv6Controller.delete);

export default router;
