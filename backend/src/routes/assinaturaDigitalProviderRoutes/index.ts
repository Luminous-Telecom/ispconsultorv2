import { Router } from 'express';
import { AssinaturaDigitalProviderController } from '../../controllers/assinatura-digital/AssinaturaDigitalProviderController';

const router = Router();

router.get('/', AssinaturaDigitalProviderController.list);
router.get('/habilitado', AssinaturaDigitalProviderController.getEnabled);
router.put('/:provider', AssinaturaDigitalProviderController.upsert);
router.patch('/:provider', AssinaturaDigitalProviderController.update);
router.get('/:provider', AssinaturaDigitalProviderController.getByProvider);
router.delete('/:provider', AssinaturaDigitalProviderController.delete);

export default router;

