import { Router } from 'express';
import { ClienteArquivoController } from '../controllers/ClienteArquivoController';
import { logger } from '../utils/logger';

const router = Router();

logger.info('Carregando rotas de cliente-arquivos');

// Ordem: rotas específicas antes das genéricas
router.get('/:id/download', ClienteArquivoController.download);

router.post('/', ClienteArquivoController.create);

router.get('/:id', ClienteArquivoController.getById);

// Rotas com prefixo literal no final para evitar conflitos
router.get('/cliente/:cliente_id', ClienteArquivoController.list);

router.put('/:id', ClienteArquivoController.update);
router.delete('/:id', ClienteArquivoController.delete);

export default router;
