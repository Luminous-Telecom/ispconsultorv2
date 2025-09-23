"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DadosEmpresaController_1 = require("../controllers/DadosEmpresaController");
const router = (0, express_1.Router)();
router.get('/', DadosEmpresaController_1.DadosEmpresaController.get);
router.put('/', DadosEmpresaController_1.DadosEmpresaController.update);
exports.default = router;
//# sourceMappingURL=dadosEmpresaRoutes.js.map