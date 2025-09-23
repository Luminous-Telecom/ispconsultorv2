"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CarneController_1 = require("../controllers/CarneController");
const router = (0, express_1.Router)();
router.get('/', CarneController_1.CarneController.list);
router.get('/:id', CarneController_1.CarneController.getById);
router.post('/', CarneController_1.CarneController.create);
router.put('/:id', CarneController_1.CarneController.update);
router.delete('/:id', CarneController_1.CarneController.delete);
router.get('/ativos', CarneController_1.CarneController.findAtivos);
router.get('/:carne/imprimir', (req, res) => {
    res.json({ success: true, message: 'Imprimir carnê - Em desenvolvimento' });
});
router.get('/:carne/pdf', (req, res) => {
    res.json({ success: true, message: 'PDF carnê - Em desenvolvimento' });
});
router.post('/:carne/gerar-titulos', (req, res) => {
    res.json({ success: true, message: 'Gerar títulos - Em desenvolvimento' });
});
router.post('/:carne/consultar-status', (req, res) => {
    res.json({ success: true, message: 'Consultar status - Em desenvolvimento' });
});
router.post('/:carne/cancelar-banco', (req, res) => {
    res.json({ success: true, message: 'Cancelar no banco - Em desenvolvimento' });
});
exports.default = router;
//# sourceMappingURL=carneRoutes.js.map