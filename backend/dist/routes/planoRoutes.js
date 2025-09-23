"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PlanoController_1 = require("../controllers/PlanoController");
const router = (0, express_1.Router)();
router.get('/', PlanoController_1.PlanoController.list);
router.get('/:id', PlanoController_1.PlanoController.getById);
router.post('/', PlanoController_1.PlanoController.create);
router.put('/:id', PlanoController_1.PlanoController.update);
router.delete('/:id', PlanoController_1.PlanoController.delete);
router.get('/ativos', PlanoController_1.PlanoController.findAtivos);
exports.default = router;
//# sourceMappingURL=planoRoutes.js.map