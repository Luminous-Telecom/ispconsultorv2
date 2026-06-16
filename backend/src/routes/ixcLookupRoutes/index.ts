import { Router } from 'express';
import { IxcLookupController } from '../../controllers/ixc/IxcLookupController';

const router = Router();

router.get('/estruturas', IxcLookupController.listEstruturas);
router.get('/filiais', IxcLookupController.listFiliais);
router.get('/tecnicos', IxcLookupController.listTecnicos);
router.get('/assuntos', IxcLookupController.listAssuntos);
router.get('/setores', IxcLookupController.listSetores);

export default router;
