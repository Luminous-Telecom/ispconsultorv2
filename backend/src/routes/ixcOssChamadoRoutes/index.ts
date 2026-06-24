import { Router } from 'express';
import multer from 'multer';
import { IxcOssChamadoController } from '../../controllers/ixc/IxcOssChamadoController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

router.get('/', IxcOssChamadoController.list);
router.get('/:id/mensagens', IxcOssChamadoController.listMensagens);
router.delete('/:id/mensagens/:mensagemId', IxcOssChamadoController.deleteMensagem);
router.get('/:id/arquivos', IxcOssChamadoController.listArquivos);
router.get('/:id/arquivos/:arquivoId/download', IxcOssChamadoController.downloadArquivo);
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
}, IxcOssChamadoController.createArquivo);
router.delete('/:id/arquivos/:arquivoId', IxcOssChamadoController.deleteArquivo);
router.get('/:id', IxcOssChamadoController.getById);
router.post('/', IxcOssChamadoController.create);
router.put('/:id', IxcOssChamadoController.update);
router.post('/:id/acoes/:acao', IxcOssChamadoController.executeAcao);
router.delete('/:id', IxcOssChamadoController.delete);

export default router;
