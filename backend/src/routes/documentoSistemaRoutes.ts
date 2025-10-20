import { Router } from 'express';
import { DocumentoSistemaController } from '../controllers/DocumentoSistemaController';
import { uploadWord } from '../utils/uploadConfig';

const router = Router();

// Rotas CRUD básicas
router.get('/', DocumentoSistemaController.list);
router.get('/tipos', DocumentoSistemaController.getTypes);
router.get('/tipo/:tipo', DocumentoSistemaController.getByType);
router.get('/tipo/:tipo/padrao', DocumentoSistemaController.getDefaultByType);
router.get('/:id', DocumentoSistemaController.show);
router.post('/', DocumentoSistemaController.create);
router.put('/:id', DocumentoSistemaController.update);
router.delete('/:id', DocumentoSistemaController.delete);

// Rota para converter arquivo Word para HTML
router.post('/converter-word', uploadWord.single('file'), DocumentoSistemaController.convertWordToHtml);

export default router;
