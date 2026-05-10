import { Router } from 'express';
import { RpkiCaController } from '../../controllers/rpki/RpkiCaController';

const router = Router();

router.get('/cas', RpkiCaController.list);
router.post('/cas', RpkiCaController.create);
router.delete('/cas/:id', RpkiCaController.delete);
router.get('/cas/:id/parents', RpkiCaController.listParents);
router.delete('/cas/:id/parents/:parentId', RpkiCaController.deleteParent);
router.get('/cas/:id/resources', RpkiCaController.listResources);
router.delete('/cas/:id/resources', RpkiCaController.clearResources);
router.post('/cas/:id/parents/:parentId/sync', RpkiCaController.syncParentResources);
router.post('/cas/:id/child-request', RpkiCaController.generateChildRequest);
router.post('/cas/:id/parent-response', RpkiCaController.importParentResponse);
router.get('/cas/:id/repositories', RpkiCaController.listRepositories);
router.delete('/cas/:id/repositories/:repositoryId', RpkiCaController.deleteRepository);
router.post('/cas/:id/repositories/:repositoryId/sync', RpkiCaController.syncRepository);
router.post('/cas/:id/publisher-request', RpkiCaController.generatePublisherRequest);
router.post('/cas/:id/repository-response', RpkiCaController.importRepositoryResponse);
router.get('/cas/:id/roas', RpkiCaController.listRoas);
router.post('/cas/:id/roas', RpkiCaController.createRoa);
router.put('/cas/:id/roas/:roaId', RpkiCaController.updateRoa);
router.post('/cas/:id/roas/:roaId/revoke', RpkiCaController.revokeRoa);
router.delete('/cas/:id/roas/:roaId', RpkiCaController.deleteRoa);
router.get('/cas/:id/roas/analyze', RpkiCaController.analyzeRoas);
router.post('/cas/:id/roas/analyze/apply', RpkiCaController.applyRoaSuggestions);

router.get('/cas/:id/aspas', RpkiCaController.listAspas);
router.post('/cas/:id/aspas', RpkiCaController.createAspa);
router.post('/cas/:id/aspas/:aspaId/revoke', RpkiCaController.revokeAspa);
router.delete('/cas/:id/aspas/:aspaId', RpkiCaController.deleteAspa);

export default router;

