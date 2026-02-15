import { Router } from 'express';
import { ImportarListaBlockdomiController } from '../../controllers/blockdomi/ImportarListaBlockdomiController';
import { ListasBlockdomiController } from '../../controllers/blockdomi/ListasBlockdomiController';

const router = Router();

router.post('/importar-lista', ImportarListaBlockdomiController.importar);
router.post('/gerar-versao', ImportarListaBlockdomiController.gerarVersao);

router.get('/versao-atual', ListasBlockdomiController.versaoAtual);
router.get('/listas/dominios', ListasBlockdomiController.dominiosTxt);
router.get('/listas/ipv4', ListasBlockdomiController.ipv4Txt);
router.get('/listas/ipv6', ListasBlockdomiController.ipv6Txt);

export default router;
