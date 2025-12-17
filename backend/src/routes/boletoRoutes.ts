import { Router } from 'express';
import { TituloPDFController } from '../controllers/titulos/TituloPDFController';

const router = Router();

// Imprimir múltiplos boletos em HTML (DEVE VIR ANTES da rota com :id)
router.post('/web/multiplos', TituloPDFController.imprimirBoletosMultiplos);
router.get('/web/multiplos', TituloPDFController.imprimirBoletosMultiplos);

// Rotas de boleto (seguindo padrão PHP)
router.get('/web/:id', TituloPDFController.imprimirBoleto);

export default router;
