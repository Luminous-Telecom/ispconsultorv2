import { Router } from 'express';
import { TermoContratoController } from '../../controllers/contratos/TermoContratoController';

const router = Router();

// Rotas para termos de contrato
router.get('/contrato/:contratoId', TermoContratoController.getByContrato);
router.get('/ativos', TermoContratoController.getAtivos);
router.get('/:id', TermoContratoController.getById);
router.post('/contrato/:contratoId', TermoContratoController.create);
router.put('/:id', TermoContratoController.update);
router.put('/:id/aceitar', TermoContratoController.marcarComoAceito);
router.put('/:id/desativar', TermoContratoController.deactivate);
router.delete('/:id', TermoContratoController.delete);

export default router;
