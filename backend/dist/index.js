"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const database_1 = require("./config/database");
require("./models");
const clienteRoutes_1 = __importDefault(require("./routes/clienteRoutes"));
const planoRoutes_1 = __importDefault(require("./routes/planoRoutes"));
const bancoRoutes_1 = __importDefault(require("./routes/bancoRoutes"));
const carneRoutes_1 = __importDefault(require("./routes/carneRoutes"));
const carneParcelaRoutes_1 = __importDefault(require("./routes/carneParcelaRoutes"));
const boletoRoutes_1 = __importDefault(require("./routes/boletoRoutes"));
const dadosEmpresaRoutes_1 = __importDefault(require("./routes/dadosEmpresaRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://seudominio.com']
        : ['http://localhost:3000'],
    credentials: true
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: {
        error: 'Muitas requisições deste IP, tente novamente em alguns minutos.'
    }
});
app.use('/api/', limiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, morgan_1.default)('combined'));
app.use('/api/clientes', clienteRoutes_1.default);
app.use('/api/planos', planoRoutes_1.default);
app.use('/api/bancos', bancoRoutes_1.default);
app.use('/api/carnes', carneRoutes_1.default);
app.use('/api/carne-parcelas', carneParcelaRoutes_1.default);
app.use('/boleto', boletoRoutes_1.default);
app.use('/api/dados-empresa', dadosEmpresaRoutes_1.default);
app.use('/api/dashboard', dashboardRoutes_1.default);
app.get('/api/buscar-cep/:cep', (req, res) => {
    res.json({ success: true, message: 'Buscar CEP - Em desenvolvimento' });
});
app.post('/webhook/efi', (req, res) => {
    res.json({ success: true, message: 'Webhook EFI - Em desenvolvimento' });
});
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
app.use((err, req, res, next) => {
    console.error('Erro:', err);
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Dados inválidos',
            details: err.details || err.message
        });
    }
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            error: 'Dados inválidos',
            details: err.errors.map((e) => e.message)
        });
    }
    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
            error: 'Registro já existe',
            details: 'Este registro já existe no sistema'
        });
    }
    return res.status(500).json({
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.originalUrl
    });
});
const startServer = async () => {
    try {
        await database_1.sequelize.authenticate();
        console.log('✅ Conexão com banco de dados estabelecida com sucesso');
        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
        });
    }
    catch (error) {
        console.error('❌ Erro ao inicializar servidor:', error);
        process.exit(1);
    }
};
process.on('SIGTERM', async () => {
    console.log('SIGTERM recebido, encerrando servidor...');
    await database_1.sequelize.close();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('SIGINT recebido, encerrando servidor...');
    await database_1.sequelize.close();
    process.exit(0);
});
startServer();
//# sourceMappingURL=index.js.map