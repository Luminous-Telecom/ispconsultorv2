import { Router } from 'express';
import { DominioController } from '../../controllers/blockdomi/DominioController';

const router = Router();

// Rotas para domínios
router.get('/', DominioController.list);
router.get('/baixar-pdfs/status', DominioController.baixarPdfsStatus);
router.get('/:id', DominioController.getById);
router.post('/bulk', DominioController.bulkCreate);
router.post('/bulk-update', DominioController.bulkUpdate);
router.post('/bulk-delete', DominioController.bulkDelete);
router.post('/sincronizar-sei-anatel', DominioController.sincronizarSeiAnatel);
router.post('/baixar-pdfs', DominioController.baixarPdfs);
router.post('/', DominioController.create);
router.put('/:id', DominioController.update);
router.delete('/:id', DominioController.delete);

export default router;
