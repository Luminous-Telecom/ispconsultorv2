import { Router } from 'express';
import { ModeloCartaController } from '../controllers/ModeloCartaController';

const router = Router();

// Rotas para cartas de cobrança
router.get('/', ModeloCartaController.list);
router.get('/:id', ModeloCartaController.show);
router.post('/', ModeloCartaController.create);
router.put('/:id', ModeloCartaController.update);
router.delete('/:id', ModeloCartaController.delete);

// Rotas para PDFs
router.get('/:id/pdf', ModeloCartaController.generatePdf);
router.get('/:id/pdf-teste', ModeloCartaController.generateTestPdf);

// Rotas para variáveis
router.get('/variaveis/disponiveis', ModeloCartaController.listarVariaveis);

export default router;
