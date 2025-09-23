import { Router } from 'express';
import { BancoController } from '../controllers/BancoController';

const router = Router();

// Rotas para bancos
router.get('/', BancoController.list);
// Rotas específicas devem vir antes de rotas com parâmetros
router.get('/ativos', BancoController.findAtivos);
router.get('/:id', BancoController.getById);
router.post('/', BancoController.create);
router.put('/:id', BancoController.update);
router.delete('/:id', BancoController.delete);

// Rotas específicas de banco (seguindo padrão PHP)
router.post('/:banco/testar-conexao', (req, res) => {
  res.json({ success: true, message: 'Testar conexão - Em desenvolvimento' });
});

router.post('/:banco/buscar-dados-api', (req, res) => {
  res.json({ success: true, message: 'Buscar dados da API - Em desenvolvimento' });
});

router.get('/:tipoBanco/url-padrao', (req, res) => {
  res.json({ success: true, message: 'URL padrão - Em desenvolvimento' });
});

export default router;
