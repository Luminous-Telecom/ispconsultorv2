import { Router } from 'express';
import { ModeloContratoController } from '../../controllers/documentos/DocumentoSistemaController';

const router = Router();

// Rotas CRUD básicas
router.get('/', ModeloContratoController.list);
router.post('/', ModeloContratoController.create);

// Rotas específicas (devem vir antes das rotas dinâmicas)
router.get('/tipos', ModeloContratoController.getTypes);
router.get('/variaveis', ModeloContratoController.listarVariaveis);
router.get('/tipo/:tipo', ModeloContratoController.getByType);
router.get('/tipo/:tipo/padrao', ModeloContratoController.getDefaultByType);

// Rotas para modelos específicos
router.post('/modelo-contrato-conteudo', ModeloContratoController.saveModeloContratoConteudo);
router.post('/modelo-termo-adesao', ModeloContratoController.saveModeloTermoAdesao);
router.post('/modelo-contrato-permanencia', ModeloContratoController.saveModeloContratoPermanencia);

// Rotas para gerar PDF do documento
router.get('/:id/pdf', ModeloContratoController.generatePdf);
router.get('/:id/pdf-teste', ModeloContratoController.generateTestPdf);
router.get('/:id/modelos', ModeloContratoController.getModelosByModeloContrato);

// Rotas para gerar PDF com conteúdo específico
router.post('/:id/pdf-conteudo', ModeloContratoController.generatePdfWithContent);
router.post('/:id/pdf-teste-conteudo', ModeloContratoController.generateTestPdfWithContent);

// Rotas CRUD por ID (devem vir por último)
router.get('/:id', ModeloContratoController.show);
router.put('/:id', ModeloContratoController.update);
router.delete('/:id', ModeloContratoController.delete);

export default router;
