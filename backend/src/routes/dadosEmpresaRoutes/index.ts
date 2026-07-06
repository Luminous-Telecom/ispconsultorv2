import { Router } from 'express';
import { DadosEmpresaController } from '../../controllers/sistema/DadosEmpresaController';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { resolveArquivosPath } from '../../utils/pathUtils';
import { getEmpresaIdOrNull, isAdminRequest } from '../../utils/tenantUtils';
import type { Request, RequestHandler } from 'express';

const router = Router();

const baseUploadDir = resolveArquivosPath('empresa');
if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

const parseEmpresaIdParam = (raw: unknown): number | null => {
  if (raw === undefined || raw === null || raw === '') return null;
  const empresaId = parseInt(String(raw), 10);
  return Number.isFinite(empresaId) && empresaId > 0 ? empresaId : null;
};

const getUploadEmpresaId = (req: Request): number | null => {
  return parseEmpresaIdParam(req.params.id) ?? getEmpresaIdOrNull(req);
};

const validateEmpresaIdParamAccess: RequestHandler = (req, res, next) => {
  const empresaId = parseEmpresaIdParam(req.params.id);
  if (empresaId == null) {
    res.status(400).json({ success: false, message: 'ID da empresa inválido' });
    return;
  }

  const tokenEmpresaId = getEmpresaIdOrNull(req);
  if (!isAdminRequest(req) && tokenEmpresaId !== empresaId) {
    res.status(403).json({
      success: false,
      message: 'Você não tem permissão para acessar os dados desta empresa',
    });
    return;
  }

  next();
};

// Storage para logo - pasta por empresa_id para multi-tenant
const logoStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const empresaId = getUploadEmpresaId(req);
    const dir = path.join(baseUploadDir, String(empresaId ?? 'default'));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `logo${ext}`);
  }
});

// Storage para assinatura - pasta por empresa_id para multi-tenant
const assinaturaStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const empresaId = getUploadEmpresaId(req);
    const dir = path.join(baseUploadDir, String(empresaId ?? 'default'));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `assinatura${ext}`);
  }
});

// Storage genérico (mantido para compatibilidade)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, baseUploadDir);
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


// GET /api/dados-empresa/titulos-saas/boletos-pdf?ids=1,2,3&empresa_id=X - PDF de boletos (admin auth)
router.get('/titulos-saas/boletos-pdf', DadosEmpresaController.getTitulosSaasBoletosPdf);

// GET /api/dados-empresa/titulos-saas?empresa_id=X - Lista saas_titulos da empresa (admin auth)
router.get('/titulos-saas', DadosEmpresaController.getTitulosSaas);

// GET /api/dados-empresa - Buscar dados completos da empresa (exclusivo do sistema - requer autenticação)
router.get('/', DadosEmpresaController.get);

// PUT /api/dados-empresa - Atualizar dados da empresa
router.put('/', DadosEmpresaController.update);

// PUT /api/dados-empresa/:id - Atualizar dados pelo ID da empresa
router.put('/:id', DadosEmpresaController.update);

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

// POST /api/dados-empresa/:id/logo - Upload da logo pelo ID da empresa
router.post('/:id/logo', validateEmpresaIdParamAccess, (req, res, next) => {
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

// POST /api/dados-empresa/:id/assinatura - Upload da assinatura pelo ID da empresa
router.post('/:id/assinatura', validateEmpresaIdParamAccess, (req, res, next) => {
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

// GET /api/dados-empresa/public - Logo e nome (público — para login e central do assinante)
router.get('/public', DadosEmpresaController.getPublic);

// GET /api/dados-empresa/public/:slug - Logo e nome da empresa identificada pelo slug (multiloja)
router.get('/public/:slug', DadosEmpresaController.getPublicBySlug);

// GET /api/dados-empresa/:id - Buscar dados completos pelo ID da empresa
router.get('/:id', DadosEmpresaController.get);

export default router;
