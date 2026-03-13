import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ImportarListaBlockdomiController } from '../../controllers/blockdomi/ImportarListaBlockdomiController';
import { BlockdomiLogAcessoController } from '../../controllers/blockdomi/BlockdomiLogAcessoController';
import { BlockdomiWhoisController } from '../../controllers/blockdomi/BlockdomiWhoisController';
import { ListasBlockdomiController } from '../../controllers/blockdomi/ListasBlockdomiController';
import { resolveArquivosPath } from '../../utils/pathUtils';

const router = Router();

const blockdomiUploadDir = resolveArquivosPath('blockdomi');
if (!fs.existsSync(blockdomiUploadDir)) {
  fs.mkdirSync(blockdomiUploadDir, { recursive: true });
}

const pdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, blockdomiUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `oficio_${Date.now()}_${name}${ext}`);
  }
});

const pdfFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Apenas arquivos PDF são permitidos'));
};

const uploadPdf = multer({
  storage: pdfStorage,
  fileFilter: pdfFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.get('/logs-acesso', BlockdomiLogAcessoController.list);
router.get('/whois/:ip', BlockdomiWhoisController.consultar);
router.get('/versao-atual', ListasBlockdomiController.versaoAtual);
router.post(
  '/upload-oficio-pdf',
  (req, res, next) => {
    uploadPdf.single('arquivo')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ success: false, message: 'Arquivo muito grande. Máximo: 50MB' });
            return;
          }
          res.status(400).json({ success: false, message: err.message });
          return;
        }
        res.status(400).json({ success: false, message: err.message || 'Erro no upload' });
        return;
      }
      next();
    });
  },
  ImportarListaBlockdomiController.uploadOficioPdf
);
router.post('/importar-lista', ImportarListaBlockdomiController.importar);
router.post('/gerar-versao', ImportarListaBlockdomiController.gerarVersao);

export default router;
