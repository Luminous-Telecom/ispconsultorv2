import { Router } from 'express';
import { DiasVencimentoController } from '../../controllers/sistema/DiasVencimentoController';

const router = Router();

router.get('/', (req, res) => DiasVencimentoController.get(req, res));
router.post('/', (req, res) => DiasVencimentoController.create(req, res));
router.put('/', (req, res) => DiasVencimentoController.update(req, res));

export default router;
