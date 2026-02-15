import { Router } from 'express';
import { ImportarListaBlockdomiController } from '../../controllers/blockdomi/ImportarListaBlockdomiController';

const router = Router();

router.post('/importar-lista', ImportarListaBlockdomiController.importar);
router.post('/gerar-versao', ImportarListaBlockdomiController.gerarVersao);

export default router;
