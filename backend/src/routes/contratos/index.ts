import { Router } from 'express';
import { ContratoController } from '../../controllers/contratos/ContratoController';
import { ContratoPlanoAdicionalController } from '../../controllers/contratos/ContratoPlanoAdicionalController';
import { ContratoIntegracaoIxcController } from '../../controllers/contratos/ContratoIntegracaoIxcController';

const router = Router();

// Rotas para contratos
router.get('/', ContratoController.list);
router.get('/ativos', ContratoController.getAtivos);
router.get('/cliente/:clienteId', ContratoController.getByCliente);

// Rotas para serviços adicionais (planos adicionais do contrato) - DEVEM VIR ANTES DAS ROTAS GENÉRICAS
// IMPORTANTE: Rotas com caminhos fixos devem vir antes de rotas com parâmetros dinâmicos
router.get('/:contrato_id/servicos-adicionais', ContratoPlanoAdicionalController.list);
router.post('/:contrato_id/servicos-adicionais', ContratoPlanoAdicionalController.create);
router.get('/:contrato_id/integracao-ixc', ContratoIntegracaoIxcController.getByContrato);
router.post('/:contrato_id/integracao-ixc', ContratoIntegracaoIxcController.link);
router.delete(
  '/:contrato_id/integracao-ixc/:integracao_ixc_provedor_id',
  ContratoIntegracaoIxcController.unlink
);
// Rotas com caminho fixo "servicos-adicionais" devem vir antes de rotas genéricas
router.put('/servicos-adicionais/:id', ContratoPlanoAdicionalController.update);
router.delete('/servicos-adicionais/:id', ContratoPlanoAdicionalController.delete);

// Rotas genéricas de contratos (devem vir depois das rotas específicas)
router.get('/:id', ContratoController.getById);
router.post('/', ContratoController.create);
router.post('/:id/gerar-titulos', ContratoController.gerarTitulos);
router.put('/:id', ContratoController.update);
router.delete('/:id', ContratoController.delete);

export default router;
