import { Router } from 'express';
import { IpPermitidoController } from '../../controllers/blockdomi/IpPermitidoController';

const router = Router();

router.get('/', IpPermitidoController.list);
router.get('/:id', IpPermitidoController.getById);
router.post('/', IpPermitidoController.create);
router.put('/:id', IpPermitidoController.update);
router.delete('/:id', IpPermitidoController.delete);

export default router;
