import { Router } from 'express';
import { ImportarListaBlockdomiController } from '../../controllers/blockdomi/ImportarListaBlockdomiController';
import { BlockdomiLogAcessoController } from '../../controllers/blockdomi/BlockdomiLogAcessoController';

const router = Router();

router.get('/logs-acesso', BlockdomiLogAcessoController.list);
router.post('/importar-lista', ImportarListaBlockdomiController.importar);
router.post('/gerar-versao', ImportarListaBlockdomiController.gerarVersao);

export default router;
