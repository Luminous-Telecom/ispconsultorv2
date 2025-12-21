import { Router } from 'express';
import { AuditoriaController } from '../controllers/AuditoriaController';

const router = Router();

// Listar logs de auditoria
router.get('/', AuditoriaController.list);

// Buscar logs por entidade e entidade_id
router.get('/entity', AuditoriaController.getByEntity);

// Gerar PDF de auditoria
router.get('/pdf', AuditoriaController.generatePdf);

// Buscar log específico
router.get('/:id', AuditoriaController.getById);

// Estatísticas
router.get('/stats/summary', AuditoriaController.getStats);

export default router;

