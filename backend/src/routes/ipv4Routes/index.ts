import { Router } from 'express';
import { IPv4Controller } from '../../controllers/blockdomi/IPv4Controller';

const router = Router();

// Rotas para IPv4
router.get('/', IPv4Controller.list);
router.get('/:id', IPv4Controller.getById);
router.post('/bulk', IPv4Controller.bulkCreate);
router.post('/', IPv4Controller.create);
router.put('/:id', IPv4Controller.update);
router.delete('/:id', IPv4Controller.delete);

export default router;
