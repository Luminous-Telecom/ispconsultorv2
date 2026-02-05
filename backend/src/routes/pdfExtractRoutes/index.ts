import { Router } from 'express';
import multer from 'multer';
import PdfExtractController from '../../controllers/blockdomi/PdfExtractController';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = Router();

// Configura multer para upload em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'));
    }
  },
});

// Rota para extrair domínios de PDF
router.post(
  '/extract',
  authMiddleware,
  upload.single('pdf'),
  PdfExtractController.extractFromPdf
);

export default router;
