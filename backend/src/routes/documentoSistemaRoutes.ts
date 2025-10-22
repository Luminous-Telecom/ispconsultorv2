import { Router } from 'express';
import { ModeloContratoController } from '../controllers/ModeloContratoController';
import { uploadWord } from '../utils/uploadConfig';

const router = Router();

// Rotas CRUD básicas
router.get('/', ModeloContratoController.list);
router.get('/tipos', ModeloContratoController.getTypes);
router.get('/variaveis', ModeloContratoController.listarVariaveis);
router.get('/tipo/:tipo', ModeloContratoController.getByType);
router.get('/tipo/:tipo/padrao', ModeloContratoController.getDefaultByType);
router.get('/:id', ModeloContratoController.show);
router.post('/', ModeloContratoController.create);
router.put('/:id', ModeloContratoController.update);
router.delete('/:id', ModeloContratoController.delete);

// Rota para converter arquivo Word para HTML
router.post('/converter-word', uploadWord.single('file'), ModeloContratoController.convertWordToHtml);

// Rota para gerar PDF do documento
router.get('/:id/pdf', ModeloContratoController.generatePdf);

// Rota para gerar PDF de teste com dados de um cliente
router.get('/:id/pdf-teste', ModeloContratoController.generateTestPdf);

export default router;
