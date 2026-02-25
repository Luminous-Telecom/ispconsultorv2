import { Router } from 'express';
import { TemplateWhatsAppController } from '../../controllers/comunicacao/TemplateWhatsAppController';

const router = Router();

router.get('/', TemplateWhatsAppController.list);
router.get('/:id', TemplateWhatsAppController.show);
router.post('/', TemplateWhatsAppController.create);
router.put('/:id', TemplateWhatsAppController.update);
router.delete('/:id', TemplateWhatsAppController.delete);

export default router;
