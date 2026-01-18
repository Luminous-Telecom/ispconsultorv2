import { Router } from 'express';
import { HotsiteController } from '../../controllers/sistema/HotsiteController';

const router = Router();

// Hotsite público (HTML renderizado)
router.get('/public', HotsiteController.getPublic);

// Variáveis do hotsite (para inserir no editor)
router.get('/variaveis', HotsiteController.variables);

// Hotsite admin (HTML bruto)
router.get('/', HotsiteController.get);

// Atualizar hotsite (rota protegida por authMiddleware)
router.put('/', HotsiteController.update);

export default router;

