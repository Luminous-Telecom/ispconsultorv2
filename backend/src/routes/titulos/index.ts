import { Router } from 'express';
import { TituloCRUDController } from '../../controllers/titulos/TituloCRUDController';
import { TituloPDFController } from '../../controllers/titulos/TituloPDFController';
import { TituloBoletoController } from '../../controllers/titulos/TituloBoletoController';

const router = Router();

// Listar títulos
router.get('/', TituloCRUDController.list);

// Gerar PDF de múltiplos boletos (DEVE VIR ANTES DE /:id)
router.get('/boletos-multiplos-pdf', TituloPDFController.gerarPdfBoletosMultiplos);

// Buscar título por ID
router.get('/:id', TituloCRUDController.show);

// Criar novo título
router.post('/', TituloCRUDController.create);

// Atualizar título
router.put('/:id', TituloCRUDController.update);

// Buscar títulos por contrato
router.get('/contrato/:contratoId', TituloCRUDController.getByContrato);

// Buscar títulos avulsos por contrato
router.get('/contrato/:contratoId/avulsos', TituloCRUDController.getAvulsosByContrato);

// Deletar título
router.delete('/:id', TituloCRUDController.destroy);

// Imprimir boleto
router.get('/:id/boleto', TituloPDFController.imprimirBoleto);

// Gerar link público de pagamento
router.get('/:id/link-pagamento', TituloCRUDController.gerarLinkPagamento);

// Marcar como pago
router.post('/:id/pagar', TituloBoletoController.marcarComoPago);

// Desmarcar como pago
router.post('/:id/desmarcar-pago', TituloBoletoController.desmarcarPago);

// Estornar título
router.post('/:id/estornar', TituloBoletoController.estornar);

// Consultar recebimento na API do banco
router.post('/:id/consultar-recebimento', TituloBoletoController.consultarRecebimento);

// Estatísticas
router.get('/stats/geral', TituloCRUDController.getStats);

router.post('/:id/enviar-whatsapp', TituloCRUDController.enviarWhatsApp);
router.post('/:id/enviar-email', TituloCRUDController.enviarEmail);

export default router;
