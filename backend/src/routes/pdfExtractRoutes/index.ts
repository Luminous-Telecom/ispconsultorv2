import { Router } from 'express';
import multer from 'multer';
import PdfExtractController from '../../controllers/blockdomi/PdfExtractController';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = Router();

// Configura multer para upload em memória (50MB - PDFs de planilhas/ofícios podem ser grandes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'));
    }
  },
});

// Rota para extrair domínios de PDF (upload)
router.post(
  '/extract',
  authMiddleware,
  upload.single('pdf'),
  PdfExtractController.extractFromPdf
);

// Rota para extrair domínios de PDF (URL)
router.post(
  '/extract-from-url',
  authMiddleware,
  PdfExtractController.extractFromPdfUrl
);

export default router;
