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

// Upload: inicia job assíncrono, retorna jobId (evita timeout)
router.post(
  '/extract',
  authMiddleware,
  upload.single('pdf'),
  PdfExtractController.extractFromPdf
);

// Consulta status/resultado do job (polling)
router.get(
  '/status/:jobId',
  authMiddleware,
  PdfExtractController.getJobStatus
);

// Extração por URL: inicia job assíncrono, retorna jobId
router.post(
  '/extract-from-url',
  authMiddleware,
  PdfExtractController.extractFromPdfUrl
);

export default router;
