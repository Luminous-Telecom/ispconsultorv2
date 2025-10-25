import { Router } from 'express';
import { TituloController } from '../controllers/TituloController';

const router = Router();

// Listar títulos
router.get('/', TituloController.list);

// Gerar PDF de múltiplos boletos (DEVE VIR ANTES DE /:id)
router.get('/boletos-multiplos-pdf', TituloController.gerarPdfBoletosMultiplos);

// Buscar título por ID
router.get('/:id', TituloController.show);

// Criar novo título
router.post('/', TituloController.create);

// Atualizar título
router.put('/:id', TituloController.update);

// Buscar títulos por contrato
router.get('/contrato/:contratoId', TituloController.getByContrato);

// Deletar título
router.delete('/:id', TituloController.destroy);

// Imprimir boleto
router.get('/:id/boleto', TituloController.imprimirBoleto);

// Marcar como pago
router.post('/:id/pagar', TituloController.marcarComoPago);

// Desmarcar como pago
router.post('/:id/desmarcar-pago', TituloController.desmarcarPago);

// Estornar título
router.post('/:id/estornar', TituloController.estornar);

// Consultar recebimento na API do banco
router.post('/:id/consultar-recebimento', TituloController.consultarRecebimento);

// Estatísticas
router.get('/stats/geral', TituloController.getStats);

export default router;
