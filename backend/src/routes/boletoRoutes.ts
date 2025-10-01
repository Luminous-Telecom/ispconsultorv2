import { Router } from 'express';
import { TituloController } from '../controllers/TituloController';

const router = Router();

// Imprimir múltiplos boletos (DEVE VIR ANTES da rota com :id)
router.post('/web/multiplos', TituloController.imprimirBoletosMultiplos);
router.get('/web/multiplos', TituloController.imprimirBoletosMultiplos);

// Rotas de boleto (seguindo padrão PHP)
router.get('/web/:id', TituloController.imprimirBoleto);

router.get('/pdf/:parcela', (req, res) => {
  res.json({ success: true, message: 'Boleto PDF - Em desenvolvimento' });
});

router.get('/imprimir/:parcela', (req, res) => {
  res.json({ success: true, message: 'Imprimir boleto - Em desenvolvimento' });
});

export default router;
