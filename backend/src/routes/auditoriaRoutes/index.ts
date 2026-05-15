import { Router } from 'express';
import { AuditoriaController } from '../../controllers/sistema/AuditoriaController';

const router = Router();

// Listar logs de auditoria (Elasticsearch)
router.get('/', AuditoriaController.list);

// Lista logs operacionais (MySQL) — modais; detalhe em GET /:id (Elasticsearch)
router.get('/operacional-list', AuditoriaController.listOperacional);

// Buscar logs por entidade e entidade_id
router.get('/entity', AuditoriaController.getByEntity);

// Gerar PDF de auditoria
router.get('/pdf', AuditoriaController.generatePdf);

// Estatísticas (antes de /:id para não ser capturado como id)
router.get('/stats/summary', AuditoriaController.getStats);

// Buscar log específico (Elasticsearch)
router.get('/:id', AuditoriaController.getById);

export default router;
