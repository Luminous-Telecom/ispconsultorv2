import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { SaasDadosEmpresaCrudController } from '../../controllers/saas/SaasDadosEmpresaCrudController';
import { saasAuthMiddleware } from '../../middleware/saasAuthMiddleware';
import { resolveArquivosPath } from '../../utils/pathUtils';

const router = Router();

router.use(saasAuthMiddleware);

const baseUploadDir = resolveArquivosPath('saas-empresa');
if (!fs.existsSync(baseUploadDir)) fs.mkdirSync(baseUploadDir, { recursive: true });

const logoSaasStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const id = req.params.id;
    const dir = id ? path.join(baseUploadDir, id) : baseUploadDir;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, _file, cb) => cb(null, 'logo.png'),
});

const assinaturaSaasStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const id = req.params.id;
    const dir = id ? path.join(baseUploadDir, id) : baseUploadDir;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, _file, cb) => cb(null, 'assinatura.png'),
});

const logoFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  cb(null, allowed.includes(file.mimetype));
};

const pngFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  cb(null, ['image/png', 'image/x-png'].includes(file.mimetype));
};

const uploadLogo = multer({ storage: logoSaasStorage, fileFilter: logoFilter, limits: { fileSize: 2 * 1024 * 1024 } });
const uploadAssinatura = multer({ storage: assinaturaSaasStorage, fileFilter: pngFilter, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', SaasDadosEmpresaCrudController.list);
router.post('/', SaasDadosEmpresaCrudController.create);
router.get('/:id', SaasDadosEmpresaCrudController.getById);
router.put('/:id', SaasDadosEmpresaCrudController.update);
router.delete('/:id', SaasDadosEmpresaCrudController.delete);

router.post('/:id/logo', (req, res, next) => {
  uploadLogo.single('logo')(req, res, (err: unknown) => {
    if (err) {
      res.status(400).json({ success: false, message: err instanceof multer.MulterError ? err.message : (err as Error).message });
      return;
    }
    next();
  });
}, SaasDadosEmpresaCrudController.uploadLogo);

router.post('/:id/assinatura', (req, res, next) => {
  uploadAssinatura.single('assinatura')(req, res, (err: unknown) => {
    if (err) {
      res.status(400).json({ success: false, message: err instanceof multer.MulterError ? err.message : (err as Error).message });
      return;
    }
    next();
  });
}, SaasDadosEmpresaCrudController.uploadAssinatura);

export default router;
