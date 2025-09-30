import { Router } from 'express';
import { TituloController } from '../controllers/TituloController';

const router = Router();

// Rotas de boleto (seguindo padrão PHP)
router.get('/web/:id', TituloController.imprimirBoleto);

router.get('/pdf/:parcela', (req, res) => {
  res.json({ success: true, message: 'Boleto PDF - Em desenvolvimento' });
});

router.get('/imprimir/:parcela', (req, res) => {
  res.json({ success: true, message: 'Imprimir boleto - Em desenvolvimento' });
});

export default router;
