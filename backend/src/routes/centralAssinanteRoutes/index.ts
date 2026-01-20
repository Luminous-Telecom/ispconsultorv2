import { Router } from 'express';
import { CentralAssinanteController } from '../../controllers/centralAssinante/CentralAssinanteController';
import { CentralAssinanteAuthController } from '../../controllers/centralAssinante/CentralAssinanteAuthController';
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

// Rota pública para login na central do assinante
router.post('/central-assinante/login', CentralAssinanteAuthController.login);

// Rota pública para recuperar senha na central do assinante
router.post('/central-assinante/recuperar-senha', CentralAssinanteAuthController.recuperarSenha);

// IMPORTANTE: Rotas mais específicas devem vir ANTES das rotas genéricas
// Novas rotas (sem expor clienteId/token na URL) - token via header Authorization: Bearer <token>
router.get('/central-assinante/me/contrato/:contratoId/pdf', (req, res, next) => {
  CentralAssinanteController.imprimirContrato(req, res).catch(next);
});

router.get('/central-assinante/me/termo/:termoId/pdf', (req, res, next) => {
  CentralAssinanteController.imprimirTermo(req, res).catch(next);
});

router.get('/central-assinante/me/fatura/:tituloId/pdf', (req, res, next) => {
  CentralAssinanteController.imprimirFatura(req, res).catch(next);
});

router.get('/central-assinante/me/recibo/:tituloId/pdf', (req, res, next) => {
  CentralAssinanteController.imprimirRecibo(req, res).catch(next);
});

router.post('/central-assinante/me/trocar-senha', (req, res, next) => {
  CentralAssinanteAuthController.trocarSenha(req, res).catch(next);
});

router.get('/central-assinante/me', (req, res, next) => {
  CentralAssinanteController.getDadosCliente(req, res).catch(next);
});

// Rotas públicas para impressão/download (requerem token)
router.get('/central-assinante/:id/:token/contrato/:contratoId/pdf', (req, res, next) => {
  logger.info('Rota de contrato PDF capturada', { params: req.params });
  CentralAssinanteController.imprimirContrato(req, res).catch(next);
});

router.get('/central-assinante/:id/:token/termo/:termoId/pdf', (req, res, next) => {
  logger.info('Rota de termo PDF capturada', { params: req.params });
  CentralAssinanteController.imprimirTermo(req, res).catch(next);
});

router.get('/central-assinante/:id/:token/fatura/:tituloId/pdf', (req, res, next) => {
  logger.info('Rota de fatura PDF capturada', { params: req.params });
  CentralAssinanteController.imprimirFatura(req, res).catch(next);
});

router.get('/central-assinante/:id/:token/recibo/:tituloId/pdf', (req, res, next) => {
  logger.info('Rota de recibo PDF capturada', { params: req.params });
  CentralAssinanteController.imprimirRecibo(req, res).catch(next);
});

// Rota para trocar senha (requer token)
router.post('/central-assinante/:id/:token/trocar-senha', (req, res, next) => {
  CentralAssinanteAuthController.trocarSenha(req, res).catch(next);
});

// Rota pública para buscar dados do cliente na central do assinante (requer token)
// Esta rota genérica deve vir POR ÚLTIMO para não capturar as rotas específicas acima
router.get('/central-assinante/:id/:token', (req, res, next) => {
  logger.info('Rota genérica da central do assinante capturada', { params: req.params });
  CentralAssinanteController.getDadosCliente(req, res).catch(next);
});

export default router;
