import { Router } from 'express';
import { ModeloDocumentoController } from '../controllers/ModeloDocumentoController';
import { uploadWord } from '../utils/uploadConfig';

const router = Router();

// Rotas CRUD básicas
router.get('/', ModeloDocumentoController.list);
router.post('/', ModeloDocumentoController.create);

// Rotas específicas (devem vir antes das rotas dinâmicas)
router.get('/tipos', ModeloDocumentoController.getTypes);
router.get('/variaveis', ModeloDocumentoController.listarVariaveis);
router.get('/tipo/:tipo', ModeloDocumentoController.getByType);
router.get('/tipo/:tipo/padrao', ModeloDocumentoController.getDefaultByType);

// Rota para converter arquivo Word para HTML
router.post('/converter-word', uploadWord.single('file'), ModeloDocumentoController.convertWordToHtml);

// Rotas para modelos específicos
router.post('/modelo-contrato-conteudo', ModeloDocumentoController.saveModeloContratoConteudo);
router.post('/modelo-termo-adesao', ModeloDocumentoController.saveModeloTermoAdesao);
router.post('/modelo-contrato-permanencia', ModeloDocumentoController.saveModeloContratoPermanencia);

// Rotas para gerar PDF do documento
router.get('/:id/pdf', ModeloDocumentoController.generatePdf);
router.get('/:id/pdf-teste', ModeloDocumentoController.generateTestPdf);
router.post('/:id/pdf-conteudo', ModeloDocumentoController.generatePdfWithContent);
router.post('/:id/pdf-teste-conteudo', ModeloDocumentoController.generateTestPdfWithContent);
router.get('/:id/modelos', ModeloDocumentoController.getModelosByModeloContrato);

// Rotas CRUD por ID (devem vir por último)
router.get('/:id', ModeloDocumentoController.show);
router.put('/:id', ModeloDocumentoController.update);
router.delete('/:id', ModeloDocumentoController.delete);

export default router;

