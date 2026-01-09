import { Router, Request, Response, NextFunction } from 'express';
import { ServidorEmailController } from '../../controllers/comunicacao/ServidorEmailController';

const router = Router();

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  ServidorEmailController.saveMensagem(req, res).catch(next);
});

router.get('/tipo/:tipo', ServidorEmailController.getMensagemByTipo);

export default router;

