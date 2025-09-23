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

const upload = multer({ storage });

// GET /api/dados-empresa - Buscar dados da empresa
router.get('/', DadosEmpresaController.get);

// PUT /api/dados-empresa - Atualizar dados da empresa
router.put('/', DadosEmpresaController.update);

// POST /api/dados-empresa/logo - Upload da logo
router.post('/logo', upload.single('logo'), DadosEmpresaController.uploadLogo);

export default router;
