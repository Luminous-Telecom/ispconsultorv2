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

// Deletar parcela
router.delete('/:id', CarneParcelaController.destroy);

// Gerar PDF do boleto (usando o mesmo método de imprimir)
router.get('/:id/pdf', CarneParcelaController.imprimirBoleto);

export default router;
