import { Router } from 'express';
import { BancoController } from '../controllers/BancoController';

const router = Router();

// Rotas para bancos
router.get('/', BancoController.list);
router.get('/:id', BancoController.getById);
router.post('/', BancoController.create);
router.put('/:id', BancoController.update);
router.delete('/:id', BancoController.destroy);

// Rotas específicas de banco (seguindo padrão PHP)
router.post('/:id/testar-conexao', BancoController.testarConexao);
router.post('/:id/buscar-dados-api', BancoController.buscarDadosApi);
router.get('/:tipoBanco/url-padrao', BancoController.urlPadrao);

export default router;
