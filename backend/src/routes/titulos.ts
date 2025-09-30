import { Router } from 'express';
import { TituloController } from '../controllers/TituloController';

const router = Router();

// Listar títulos
router.get('/', TituloController.list);

// Buscar título por ID
router.get('/:id', TituloController.show);

// Criar novo título
router.post('/', TituloController.create);

// Atualizar título
router.put('/:id', TituloController.update);

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

// Estatísticas
router.get('/stats/geral', TituloController.getStats);

export default router;
