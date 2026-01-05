import { Router } from 'express';
import { NotaFiscalController } from '../controllers/NotaFiscalController';
import { logger } from '../utils/logger';

const router = Router();

logger.info('Rotas de Nota Fiscal carregadas', {
  rotas: [
    'GET /',
    'GET /cliente/:cliente_id',
    'POST /gerar',
    'GET /nfse/multiplos',
    'GET /:id/status',
    'POST /:id/cancelar',
    'GET /:id/pdf',
    'GET /:id'
  ]
});

// Rotas CRUD
router.get('/', (req, res) => NotaFiscalController.index(req, res));
router.get('/cliente/:cliente_id', (req, res) => NotaFiscalController.listarPorCliente(req, res));

// Rotas de geração
router.post('/gerar', (req, res) => NotaFiscalController.gerar(req, res));

// Rota para imprimir múltiplas NFS-e (DEVE VIR ANTES das rotas com :id)
router.get('/nfse/multiplos', (req, res) => NotaFiscalController.imprimirMultiplas(req, res));

// Rotas de operações (rotas com parâmetros dinâmicos devem vir por último)
router.get('/:id/status', (req, res) => NotaFiscalController.consultarStatus(req, res));
router.post('/:id/cancelar', (req, res) => NotaFiscalController.cancelar(req, res));
router.get('/:id/pdf', (req, res) => NotaFiscalController.imprimir(req, res));
router.get('/:id', (req, res) => NotaFiscalController.show(req, res));

export default router;

