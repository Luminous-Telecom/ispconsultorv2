import express from 'express';
import { CarneParcelaController } from '../controllers/CarneParcelaController';

const router = express.Router();

// Listar parcelas com filtros
router.get('/', CarneParcelaController.list);

// Buscar parcela por ID
router.get('/:id', CarneParcelaController.getById);

// Marcar parcela como paga
router.post('/:id/pagar', CarneParcelaController.marcarPago);

// Desmarcar pagamento da parcela
router.post('/:id/desmarcar-pago', CarneParcelaController.desmarcarPago);

// Imprimir boleto
router.get('/:id/imprimir', CarneParcelaController.imprimirBoleto);

// Atualizar parcela
router.put('/:id', CarneParcelaController.update);

// Gerar PDF do boleto
router.get('/:id/pdf', CarneParcelaController.gerarPdfBoleto);

export default router;
