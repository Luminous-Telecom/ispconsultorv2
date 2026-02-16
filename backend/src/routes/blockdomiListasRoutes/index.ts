/**
 * Rotas TXT do Blockdomi na raiz (sem prefixo /api/blockdomi)
 * /domain/version, /domain/all, /v4/all, /v6/all
 */
import { Router } from 'express';
import { ListasBlockdomiController } from '../../controllers/blockdomi/ListasBlockdomiController';

const router = Router();

router.get('/domain/version', ListasBlockdomiController.versaoAtual);
router.get('/domain/all', ListasBlockdomiController.dominiosTxt);
router.get('/v4/all', ListasBlockdomiController.ipv4Txt);
router.get('/v6/all', ListasBlockdomiController.ipv6Txt);

export default router;
