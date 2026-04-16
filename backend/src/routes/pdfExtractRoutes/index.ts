import { Router } from 'express';
import multer from 'multer';
import PdfExtractController from '../../controllers/blockdomi/PdfExtractController';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = Router();

// Configura multer para upload em memória (100MB - PDFs de planilhas/ofícios podem ser grandes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
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

// Stream de progresso em tempo real (SSE)
router.get(
  '/progress/:jobId',
  authMiddleware,
  PdfExtractController.streamProgress
);

// Extração por URL: inicia job assíncrono, retorna jobId
router.post(
  '/extract-from-url',
  authMiddleware,
  PdfExtractController.extractFromPdfUrl
);

export default router;
