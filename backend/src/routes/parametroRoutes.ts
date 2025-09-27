import { Router } from 'express';
import ParametroController from '../controllers/ParametroController';

const router = Router();
const parametroController = new ParametroController();

// Listar todos os parâmetros
router.get('/', parametroController.index.bind(parametroController));

// Obter parâmetros por categoria
router.get('/categoria/:categoria', parametroController.getByCategoria.bind(parametroController));

// Obter parâmetro por chave
router.get('/:chave', parametroController.getByChave.bind(parametroController));

// Atualizar parâmetro
router.put('/:chave', parametroController.update.bind(parametroController));

// Atualizar múltiplos parâmetros
router.put('/', parametroController.updateMultiple.bind(parametroController));

// Resetar parâmetros para valores padrão
router.post('/reset-defaults', parametroController.resetDefaults.bind(parametroController));

export default router;
