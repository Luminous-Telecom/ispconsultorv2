/**
 * Rotas públicas do Blockdomi - exclusivas para o site público.
 * Sem autenticação e sem restrição de IP.
 * Não misturar com a API privada /api/blockdomi.
 */
import { Router } from 'express';
import { BlockdomiPublicoController } from '../../controllers/blockdomi/BlockdomiPublicoController';

const router = Router();

router.get('/', BlockdomiPublicoController.listar);
router.get('/versao', BlockdomiPublicoController.versaoAtual);

export default router;
