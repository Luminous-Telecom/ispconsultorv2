import { Router } from 'express';
import { PagamentoPublicoController } from '../../controllers/pagamento/PagamentoPublicoController';

const router = Router();

// Fluxo preferido: token em POST body → cookie httpOnly → URL sem token
router.post('/pagamento/session', PagamentoPublicoController.initSession);
router.get('/pagamento/:id/pdf', PagamentoPublicoController.downloadPdfPorSessao);
router.get('/pagamento/:id', PagamentoPublicoController.getTituloPorSessao);

// Legacy: token na URL (mantido para links já enviados por e-mail/WhatsApp)
router.get('/pagamento/:id/:token', PagamentoPublicoController.getTituloPublico);
router.get('/pagamento/:id/:token/pdf', PagamentoPublicoController.downloadPdf);

export default router;

