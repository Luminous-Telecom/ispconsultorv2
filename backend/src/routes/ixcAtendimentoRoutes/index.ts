import { Router } from 'express';
import multer from 'multer';
import { IxcAtendimentoController } from '../../controllers/ixc/IxcAtendimentoController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

router.get('/', IxcAtendimentoController.list);
router.get('/departamentos', IxcAtendimentoController.listDepartamentos);
router.get('/tecnicos', IxcAtendimentoController.listTecnicos);
router.get('/:id/mensagens', IxcAtendimentoController.listMensagens);
router.post('/:id/mensagens', IxcAtendimentoController.createMensagem);
router.delete('/:id/mensagens/:mensagemId', IxcAtendimentoController.deleteMensagem);
router.get('/:id/arquivos', IxcAtendimentoController.listArquivos);
router.get('/:id/arquivos/:arquivoId/download', IxcAtendimentoController.downloadArquivo);
router.post('/:id/arquivos', (req, res, next) => {
  upload.single('arquivo')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          success: false,
          message: 'Arquivo muito grande. Tamanho máximo: 50MB',
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: err instanceof Error ? err.message : 'Erro ao processar arquivo',
      });
      return;
    }
    next();
  });
}, IxcAtendimentoController.createArquivo);
router.delete('/:id/arquivos/:arquivoId', IxcAtendimentoController.deleteArquivo);
router.get('/:id/ordens-servico', IxcAtendimentoController.listOrdensServico);
router.get('/:id/imprimir', IxcAtendimentoController.imprimir);
router.get('/:id', IxcAtendimentoController.getById);
router.post('/', IxcAtendimentoController.create);
router.put('/:id', IxcAtendimentoController.update);
router.delete('/:id', IxcAtendimentoController.delete);

export default router;
