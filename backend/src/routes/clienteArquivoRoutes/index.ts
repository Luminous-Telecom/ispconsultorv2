import { Router } from 'express';
import { ClienteArquivoController } from '../../controllers/clientes/ClienteArquivoController';
import { logger } from '../../utils/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { resolveArquivosPath } from '../../utils/pathUtils';

const router = Router();

logger.info('Carregando rotas de cliente-arquivos');

// Configuração do multer para upload de arquivos de cliente
const uploadDir = resolveArquivosPath('clientes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    // Tentar obter cliente_id do body (vem do FormData)
    const clienteId = req.body?.cliente_id;
    if (clienteId) {
      const clienteDir = path.join(uploadDir, String(clienteId));
      if (!fs.existsSync(clienteDir)) {
        fs.mkdirSync(clienteDir, { recursive: true });
      }
      cb(null, clienteDir);
    } else {
      // Fallback: salvar na raiz e mover depois
      cb(null, uploadDir);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${Date.now()}_${name}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Ordem: rotas específicas antes das genéricas
router.get('/:id/download', ClienteArquivoController.download);

router.post('/', (req, res, next) => {
  upload.single('arquivo')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ 
            success: false,
            message: 'Arquivo muito grande. Tamanho máximo: 50MB' 
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
    if (!req.file) {
      res.status(400).json({ 
        success: false,
        message: 'Nenhum arquivo foi enviado' 
      });
      return;
    }
    next();
  });
}, ClienteArquivoController.create);

router.get('/:id', ClienteArquivoController.getById);

// Rotas com prefixo literal no final para evitar conflitos
router.get('/cliente/:cliente_id', ClienteArquivoController.list);

router.put('/:id', ClienteArquivoController.update);
router.delete('/:id', ClienteArquivoController.delete);

export default router;
