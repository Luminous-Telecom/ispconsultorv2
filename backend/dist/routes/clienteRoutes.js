"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ClienteController_1 = require("../controllers/ClienteController");
const router = (0, express_1.Router)();
router.get('/', ClienteController_1.ClienteController.index);
router.get('/ativos', ClienteController_1.ClienteController.findAtivos);
router.get('/cnpj/:cnpj', ClienteController_1.ClienteController.findByCnpj);
router.get('/:id', ClienteController_1.ClienteController.show);
router.post('/', ClienteController_1.ClienteController.store);
router.put('/:id', ClienteController_1.ClienteController.update);
router.delete('/:id', ClienteController_1.ClienteController.destroy);
router.get('/api/buscar-cep/:cep', ClienteController_1.ClienteController.buscarCep);
exports.default = router;
//# sourceMappingURL=clienteRoutes.js.map