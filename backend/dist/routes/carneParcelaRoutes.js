"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    res.json({ success: true, message: 'Parcelas de carnê - Em desenvolvimento' });
});
router.get('/:id', (req, res) => {
    res.json({ success: true, message: 'Parcela específica - Em desenvolvimento' });
});
router.post('/', (req, res) => {
    res.json({ success: true, message: 'Criar parcela - Em desenvolvimento' });
});
router.put('/:id', (req, res) => {
    res.json({ success: true, message: 'Atualizar parcela - Em desenvolvimento' });
});
router.delete('/:id', (req, res) => {
    res.json({ success: true, message: 'Excluir parcela - Em desenvolvimento' });
});
router.post('/:carneParcela/pagar', (req, res) => {
    res.json({ success: true, message: 'Pagar parcela - Em desenvolvimento' });
});
router.post('/:carneParcela/desmarcar-pago', (req, res) => {
    res.json({ success: true, message: 'Desmarcar parcela como paga - Em desenvolvimento' });
});
exports.default = router;
//# sourceMappingURL=carneParcelaRoutes.js.map