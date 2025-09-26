import { Router } from 'express';
import { SchedulerController } from '../controllers/SchedulerController';

const router = Router();

// Rotas para gerenciar rotinas agendadas
router.get('/', SchedulerController.list);
router.get('/stats', SchedulerController.getStats);
router.get('/:id', SchedulerController.getById);
router.get('/:id/logs', SchedulerController.getExecutionLogs);
router.post('/', SchedulerController.create);
router.put('/:id', SchedulerController.update);
router.patch('/:id/toggle', SchedulerController.toggle);
router.post('/:id/execute', SchedulerController.execute);
router.delete('/:id', SchedulerController.delete);

// Rotas para controlar o agendador
router.post('/start', SchedulerController.start);
router.post('/stop', SchedulerController.stop);

export default router;
