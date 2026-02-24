import { Router } from 'express';
import { CentralAssinanteController } from '../../controllers/centralAssinante/CentralAssinanteController';
import { CentralAssinanteAuthController } from '../../controllers/centralAssinante/CentralAssinanteAuthController';
import { authRateLimitMiddleware } from '../../middleware/rateLimitMiddleware';
import { logger } from '../../utils/logger';

const router = Router();

// Middleware para log de todas as requisições
router.use('/central-assinante', (req, res, next) => {
  logger.info('Requisição recebida na central do assinante', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    params: req.params,
    query: req.query
  });
  next();
});

// ── Rotas com slug (multiloja) ─────────────────────────────────────────────

// POST /api/central-assinante/:slug/login
router.post('/central-assinante/:slug/login', authRateLimitMiddleware(), CentralAssinanteAuthController.login);

// POST /api/central-assinante/:slug/recuperar-senha
router.post('/central-assinante/:slug/recuperar-senha', CentralAssinanteAuthController.recuperarSenha);

// IMPORTANTE: rotas mais específicas devem vir ANTES das rotas genéricas

// GET /api/central-assinante/:slug/me/contrato/:contratoId/pdf
router.get('/central-assinante/:slug/me/contrato/:contratoId/pdf', (req, res, next) => {
  CentralAssinanteController.imprimirContrato(req, res).catch(next);
});

// GET /api/central-assinante/:slug/me/termo/:termoId/pdf
router.get('/central-assinante/:slug/me/termo/:termoId/pdf', (req, res, next) => {
  CentralAssinanteController.imprimirTermo(req, res).catch(next);
});

// GET /api/central-assinante/:slug/me/fatura/:tituloId/pdf
router.get('/central-assinante/:slug/me/fatura/:tituloId/pdf', (req, res, next) => {
  CentralAssinanteController.imprimirFatura(req, res).catch(next);
});

// GET /api/central-assinante/:slug/me/recibo/:tituloId/pdf
router.get('/central-assinante/:slug/me/recibo/:tituloId/pdf', (req, res, next) => {
  CentralAssinanteController.imprimirRecibo(req, res).catch(next);
});

// POST /api/central-assinante/:slug/me/trocar-senha
router.post('/central-assinante/:slug/me/trocar-senha', (req, res, next) => {
  CentralAssinanteAuthController.trocarSenha(req, res).catch(next);
});

// GET /api/central-assinante/:slug/me
router.get('/central-assinante/:slug/me', (req, res, next) => {
  CentralAssinanteController.getDadosCliente(req, res).catch(next);
});

// ── Rotas legacy com id/token na URL (mantidas para links de e-mail já enviados) ──

// GET /api/central-assinante/:id/:token/contrato/:contratoId/pdf
router.get('/central-assinante/:id/:token/contrato/:contratoId/pdf', (req, res, next) => {
  logger.info('Rota legacy de contrato PDF capturada', { params: req.params });
  CentralAssinanteController.imprimirContrato(req, res).catch(next);
});

// GET /api/central-assinante/:id/:token/termo/:termoId/pdf
router.get('/central-assinante/:id/:token/termo/:termoId/pdf', (req, res, next) => {
  logger.info('Rota legacy de termo PDF capturada', { params: req.params });
  CentralAssinanteController.imprimirTermo(req, res).catch(next);
});

// GET /api/central-assinante/:id/:token/fatura/:tituloId/pdf
router.get('/central-assinante/:id/:token/fatura/:tituloId/pdf', (req, res, next) => {
  logger.info('Rota legacy de fatura PDF capturada', { params: req.params });
  CentralAssinanteController.imprimirFatura(req, res).catch(next);
});

// GET /api/central-assinante/:id/:token/recibo/:tituloId/pdf
router.get('/central-assinante/:id/:token/recibo/:tituloId/pdf', (req, res, next) => {
  logger.info('Rota legacy de recibo PDF capturada', { params: req.params });
  CentralAssinanteController.imprimirRecibo(req, res).catch(next);
});

// POST /api/central-assinante/:id/:token/trocar-senha
router.post('/central-assinante/:id/:token/trocar-senha', (req, res, next) => {
  CentralAssinanteAuthController.trocarSenha(req, res).catch(next);
});

// GET /api/central-assinante/:id/:token — deve vir POR ÚLTIMO para não capturar rotas acima
router.get('/central-assinante/:id/:token', (req, res, next) => {
  logger.info('Rota legacy genérica da central do assinante capturada', { params: req.params });
  CentralAssinanteController.getDadosCliente(req, res).catch(next);
});

export default router;
