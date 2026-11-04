/**
 * Rotas TXT do Blockdomi na raiz (sem prefixo /api/blockdomi)
 * /domain/version, /domain/all, /v4/all, /v6/all
 * MikroTik: /domain/all/adlist (v7) e /commands/mikrotik/v6
 */
import { Router } from 'express';
import { ListasBlockdomiController } from '../../controllers/blockdomi/ListasBlockdomiController';

const router = Router();

router.get('/domain/version', ListasBlockdomiController.versaoAtual);
router.get('/domain/all', ListasBlockdomiController.dominiosTxt);
router.get('/domain/all/adlist', ListasBlockdomiController.dominiosAdlist);
router.get('/domain/all/adlist/:ip', ListasBlockdomiController.dominiosAdlist);
router.get('/api/domain/all/adlist', ListasBlockdomiController.dominiosAdlist);
router.get('/api/domain/all/adlist/:ip', ListasBlockdomiController.dominiosAdlist);
router.get('/domains/all/adlist', ListasBlockdomiController.dominiosAdlist);
router.get('/domains/all/adlist/:ip', ListasBlockdomiController.dominiosAdlist);
router.get('/commands/mikrotik/v6', ListasBlockdomiController.dominiosMikrotikV6);
router.get('/v4/all', ListasBlockdomiController.ipv4Txt);
router.get('/v6/all', ListasBlockdomiController.ipv6Txt);

export default router;
