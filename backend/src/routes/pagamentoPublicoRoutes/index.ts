import { Router } from 'express';
import { PagamentoPublicoController } from '../../controllers/pagamento/PagamentoPublicoController';

const router = Router();

// Rota pública para buscar dados do título (API JSON)
router.get('/pagamento/:id/:token', PagamentoPublicoController.getTituloPublico);

// Rota pública para download do PDF
router.get('/pagamento/:id/:token/pdf', PagamentoPublicoController.downloadPdf);

export default router;

