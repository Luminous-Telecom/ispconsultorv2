import { Router } from 'express';
import { DadosEmpresaController } from '../controllers/DadosEmpresaController';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configuração do multer para upload de logo
const uploadDir = path.resolve(process.cwd(), 'uploads', 'empresa');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `${name}_${Date.now()}${ext}`);
  }
});

// Filtro para aceitar apenas imagens
const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos de imagem são permitidos (JPG, PNG, GIF, WEBP)'));
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  }
});

// GET /api/dados-empresa - Buscar dados da empresa
router.get('/', DadosEmpresaController.get);

// PUT /api/dados-empresa - Atualizar dados da empresa
router.put('/', DadosEmpresaController.update);

// GET /api/dados-empresa/logo - Buscar logo da empresa (redireciona para arquivo)
router.get('/logo', DadosEmpresaController.getLogo);

// POST /api/dados-empresa/logo - Upload da logo
router.post('/logo', (req, res, next) => {
  upload.single('logo')(req, res, (err) => {
    if (err) {
      // Tratar erros do multer
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            success: false,
            message: 'Arquivo muito grande. Tamanho máximo: 2MB' 
          });
        }
        return res.status(400).json({ 
          success: false,
          message: `Erro no upload: ${err.message}` 
        });
      }
      // Erro de validação de tipo de arquivo
      return res.status(400).json({ 
        success: false,
        message: err.message || 'Erro ao processar arquivo' 
      });
    }
    next();
  });
}, DadosEmpresaController.uploadLogo);

export default router;
