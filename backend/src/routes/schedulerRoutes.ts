import { Router } from 'express';
import SchedulerController from '../controllers/SchedulerController';

const router = Router();
const schedulerController = new SchedulerController();

// Rotas para gerenciar rotinas agendadas
router.get('/', schedulerController.index.bind(schedulerController));
router.get('/:id', schedulerController.show.bind(schedulerController));
router.post('/', schedulerController.store.bind(schedulerController));
router.put('/:id', schedulerController.update.bind(schedulerController));
router.delete('/:id', schedulerController.destroy.bind(schedulerController));

// Rotas específicas
router.patch('/:id/toggle', schedulerController.toggle.bind(schedulerController));
router.post('/:id/execute', schedulerController.execute.bind(schedulerController));

// Status do scheduler
router.get('/status', schedulerController.status.bind(schedulerController));

// Logs de execução
router.get('/logs/:id', schedulerController.getLogs.bind(schedulerController));
router.get('/logs', schedulerController.getAllLogs.bind(schedulerController));

export default router;