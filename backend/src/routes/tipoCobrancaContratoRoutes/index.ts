import { Router } from 'express';
import { TipoCobrancaContratoController } from '../../controllers/cadastros/TipoCobrancaContratoController';

const router = Router();

router.get('/', TipoCobrancaContratoController.list);
router.get('/ativos', TipoCobrancaContratoController.findAtivos);
router.get('/:id', TipoCobrancaContratoController.getById);
router.post('/', TipoCobrancaContratoController.create);
router.put('/:id', TipoCobrancaContratoController.update);
router.delete('/:id', TipoCobrancaContratoController.destroy);

export default router;
