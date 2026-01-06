import { Router } from 'express';
import { DadosEmpresaController } from '../../controllers/sistema/DadosEmpresaController';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { resolveArquivosPath } from '../../utils/pathUtils';

const router = Router();

// Configuração do multer para upload de logo
const uploadDir = resolveArquivosPath('empresa');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage para logo - sempre usa o mesmo nome para substituir o arquivo antigo
const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, _file, cb) => {
    // Sempre usar o mesmo nome para substituir o arquivo antigo
    cb(null, 'logo.png');
  }
});

// Storage para assinatura - sempre usa o mesmo nome para substituir o arquivo antigo
const assinaturaStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, _file, cb) => {
    // Sempre usar o mesmo nome para substituir o arquivo antigo
    cb(null, 'assinatura.png');
  }
});

// Storage genérico (mantido para compatibilidade)
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

// Filtro para aceitar apenas PNG (para assinatura)
const pngFileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Aceitar PNG e variações comuns
  const allowedMimes = ['image/png', 'image/x-png'];
  const allowedExtensions = ['.png'];
  
  const isValidMime = allowedMimes.includes(file.mimetype);
  const isValidExtension = allowedExtensions.some(ext => 
    file.originalname.toLowerCase().endsWith(ext)
  );
  
  if (isValidMime || isValidExtension) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos PNG são permitidos para assinatura'));
  }
};

// Upload para logo - usa storage específico que sempre substitui o arquivo antigo
const upload = multer({ 
  storage: logoStorage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  }
});

// GET /api/dados-empresa/public - Buscar dados públicos da empresa (para site público)
router.get('/public', DadosEmpresaController.getPublic);

// GET /api/dados-empresa - Buscar dados completos da empresa (exclusivo do sistema - requer autenticação)
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
          res.status(400).json({ 
            success: false,
            message: 'Arquivo muito grande. Tamanho máximo: 2MB' 
          });
          return;
        }
        res.status(400).json({ 
          success: false,
          message: `Erro no upload: ${err.message}` 
        });
        return;
      }
      // Erro de validação de tipo de arquivo
      res.status(400).json({ 
        success: false,
        message: err.message || 'Erro ao processar arquivo' 
      });
      return;
    }
    next();
  });
}, DadosEmpresaController.uploadLogo);

// Upload específico para assinatura (apenas PNG) - usa storage específico que sempre substitui o arquivo antigo
const uploadAssinatura = multer({ 
  storage: assinaturaStorage,
  fileFilter: pngFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// POST /api/dados-empresa/assinatura - Upload da assinatura do responsável
router.post('/assinatura', (req, res, next) => {
  uploadAssinatura.single('assinatura')(req, res, (err) => {
    if (err) {
      // Tratar erros do multer
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ 
            success: false,
            message: 'Arquivo muito grande. Tamanho máximo: 10MB' 
          });
          return;
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          res.status(400).json({ 
            success: false,
            message: 'Campo de arquivo inválido. Use o campo "assinatura"' 
          });
          return;
        }
        res.status(400).json({ 
          success: false,
          message: `Erro no upload: ${err.message}` 
        });
        return;
      }
      // Erro de validação de tipo de arquivo
      res.status(400).json({ 
        success: false,
        message: err.message || 'Erro ao processar arquivo' 
      });
      return;
    }
    // Verificar se o arquivo foi recebido
    if (!req.file) {
      res.status(400).json({ 
        success: false,
        message: 'Nenhum arquivo foi enviado' 
      });
      return;
    }
    next();
  });
}, DadosEmpresaController.uploadAssinatura);

export default router;
