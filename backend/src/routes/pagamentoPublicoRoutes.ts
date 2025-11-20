import { Router } from 'express';
import { PagamentoPublicoController } from '../controllers/PagamentoPublicoController';

const router = Router();

// Rota pública para página de pagamento
router.get('/pagamento/:id/:token', PagamentoPublicoController.paginaPagamento);

// Rota pública para download do PDF
router.get('/pagamento/:id/:token/pdf', PagamentoPublicoController.downloadPdf);

export default router;

