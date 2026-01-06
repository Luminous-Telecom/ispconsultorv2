import { Router } from 'express';
import { ModeloCartaController } from '../../controllers/documentos/ModeloCartaController';

const router = Router();

// Rotas para cartas de cobrança
router.get('/', ModeloCartaController.list);
router.post('/', ModeloCartaController.create);

// Rotas para variáveis
router.get('/variaveis/disponiveis', ModeloCartaController.listarVariaveis);

// Rotas para PDFs
router.get('/:id/pdf', ModeloCartaController.generatePdf);
router.get('/:id/pdf-teste', ModeloCartaController.generateTestPdf);

// Rotas CRUD por ID
router.get('/:id', ModeloCartaController.show);
router.put('/:id', ModeloCartaController.update);
router.delete('/:id', ModeloCartaController.delete);

export default router;
