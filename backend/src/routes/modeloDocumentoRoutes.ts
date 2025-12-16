import { Router } from 'express';
import { ModeloDocumentoController } from '../controllers/ModeloDocumentoController';
import { uploadWord } from '../utils/uploadConfig';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configuração do multer para upload de imagens de documentos
const documentosUploadDir = path.resolve(process.cwd(), 'uploads', 'documentos');
if (!fs.existsSync(documentosUploadDir)) {
  fs.mkdirSync(documentosUploadDir, { recursive: true });
}

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, documentosUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `doc_${Date.now()}_${name}${ext}`);
  }
});

const imageFileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos de imagem são permitidos (JPG, PNG, GIF, WEBP)'));
  }
};

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Rotas CRUD básicas
router.get('/', ModeloDocumentoController.list);
router.post('/', ModeloDocumentoController.create);

// Rotas específicas (devem vir antes das rotas dinâmicas)
router.get('/tipos', ModeloDocumentoController.getTypes);
router.get('/variaveis', ModeloDocumentoController.listarVariaveis);
router.get('/tipo/:tipo', ModeloDocumentoController.getByType);
router.get('/tipo/:tipo/padrao', ModeloDocumentoController.getDefaultByType);

// Rota para upload de imagens do editor
router.post('/upload-imagem', (req, res, next) => {
  uploadImage.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ 
            success: false,
            message: 'Arquivo muito grande. Tamanho máximo: 5MB' 
          });
          return;
        }
        res.status(400).json({ 
          success: false,
          message: `Erro no upload: ${err.message}` 
        });
        return;
      }
      res.status(400).json({ 
        success: false,
        message: err.message || 'Erro ao processar arquivo' 
      });
      return;
    }
    next();
  });
}, ModeloDocumentoController.uploadImagem);

// Rota para converter arquivo Word para HTML
router.post('/converter-word', uploadWord.single('file'), ModeloDocumentoController.convertWordToHtml);

// Rotas para modelos específicos
router.post('/modelo-contrato-conteudo', ModeloDocumentoController.saveModeloContratoConteudo);
router.post('/modelo-termo-adesao', ModeloDocumentoController.saveModeloTermoAdesao);
router.post('/modelo-contrato-permanencia', ModeloDocumentoController.saveModeloContratoPermanencia);

// Rotas para gerar PDF do documento
router.get('/:id/pdf', ModeloDocumentoController.generatePdf);
router.get('/:id/pdf-teste', ModeloDocumentoController.generateTestPdf);
router.post('/:id/pdf-conteudo', ModeloDocumentoController.generatePdfWithContent);
router.post('/:id/pdf-teste-conteudo', ModeloDocumentoController.generateTestPdfWithContent);
router.get('/:id/modelos', ModeloDocumentoController.getModelosByModeloContrato);

// Rotas CRUD por ID (devem vir por último)
router.get('/:id', ModeloDocumentoController.show);
router.put('/:id', ModeloDocumentoController.update);
router.delete('/:id', ModeloDocumentoController.delete);

export default router;

