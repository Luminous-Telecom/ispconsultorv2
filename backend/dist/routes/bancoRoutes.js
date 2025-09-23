"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const BancoController_1 = require("../controllers/BancoController");
const router = (0, express_1.Router)();
router.get('/', BancoController_1.BancoController.list);
router.get('/:id', BancoController_1.BancoController.getById);
router.post('/', BancoController_1.BancoController.create);
router.put('/:id', BancoController_1.BancoController.update);
router.delete('/:id', BancoController_1.BancoController.delete);
router.get('/ativos', BancoController_1.BancoController.findAtivos);
router.post('/:banco/testar-conexao', (req, res) => {
    res.json({ success: true, message: 'Testar conexão - Em desenvolvimento' });
});
router.post('/:banco/buscar-dados-api', (req, res) => {
    res.json({ success: true, message: 'Buscar dados da API - Em desenvolvimento' });
});
router.get('/:tipoBanco/url-padrao', (req, res) => {
    res.json({ success: true, message: 'URL padrão - Em desenvolvimento' });
});
exports.default = router;
//# sourceMappingURL=bancoRoutes.js.map