"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/web/:parcela', (req, res) => {
    res.json({ success: true, message: 'Boleto web - Em desenvolvimento' });
});
router.get('/pdf/:parcela', (req, res) => {
    res.json({ success: true, message: 'Boleto PDF - Em desenvolvimento' });
});
router.get('/imprimir/:parcela', (req, res) => {
    res.json({ success: true, message: 'Imprimir boleto - Em desenvolvimento' });
});
exports.default = router;
//# sourceMappingURL=boletoRoutes.js.map