"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const Cliente_1 = require("../models/Cliente");
const Plano_1 = require("../models/Plano");
const Banco_1 = require("../models/Banco");
const Carne_1 = require("../models/Carne");
const CarneParcela_1 = require("../models/CarneParcela");
const sequelize_1 = require("sequelize");
class DashboardController {
    static async getDashboardData(req, res) {
        try {
            const [statsData, carnesRecentes, parcelasVencidas] = await Promise.all([
                DashboardController.getStatsData(),
                DashboardController.getCarnesRecentesData(5),
                DashboardController.getParcelasVencidasData(10)
            ]);
            const dashboardData = {
                stats: statsData,
                carnesRecentes,
                parcelasVencidas,
                receitaUltimosMeses: {
                    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                    data: [0, 0, 0, 0, 0, 0]
                },
                clientesPorStatus: {
                    labels: ['Ativos', 'Inativos'],
                    data: [statsData.planosAtivos, statsData.totalClientes - statsData.planosAtivos]
                }
            };
            res.json({
                success: true,
                data: dashboardData
            });
        }
        catch (error) {
            console.error('Erro ao obter dados do dashboard:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
    static async getStatsData() {
        const [totalClientes, clientesAtivos, totalPlanos, planosAtivos, totalBancos, bancosAtivos, totalCarnes, carnesAtivos, carnesPagos, carnesPendentes] = await Promise.all([
            Cliente_1.Cliente.count(),
            Cliente_1.Cliente.count({ where: { ativo: true } }),
            Plano_1.Plano.count(),
            Plano_1.Plano.count({ where: { status: 'ativo' } }),
            Banco_1.Banco.count(),
            Banco_1.Banco.count({ where: { ativo: true } }),
            Carne_1.Carne.count(),
            Carne_1.Carne.count({ where: { status: 'ativo' } }),
            Carne_1.Carne.count({ where: { status: 'pago' } }),
            Carne_1.Carne.count({ where: { status: 'pendente' } })
        ]);
        const carnes = await Carne_1.Carne.findAll({
            include: [{ association: 'parcelas' }]
        });
        let valorTotalCarnes = 0;
        let valorTotalPago = 0;
        let valorTotalPendente = 0;
        for (const carne of carnes) {
            const parcelas = await carne.getParcelas();
            const valorCarne = parcelas.reduce((total, parcela) => {
                return total + parseFloat(parcela.valor_parcela.toString());
            }, 0);
            valorTotalCarnes += valorCarne;
            if (carne.status === 'pago') {
                valorTotalPago += valorCarne;
            }
            else if (carne.status === 'pendente' || carne.status === 'ativo') {
                valorTotalPendente += valorCarne;
            }
        }
        return {
            totalClientes: totalClientes,
            clientesAtivos: clientesAtivos,
            planosAtivos: planosAtivos,
            carnesAtivos: carnesAtivos,
            parcelasVencidas: await CarneParcela_1.CarneParcela.count({
                where: {
                    data_vencimento: { [sequelize_1.Op.lte]: new Date() },
                    status: 'pendente'
                }
            }),
            valorTotalReceber: valorTotalPendente,
            valorTotalRecebido: valorTotalPago,
            receitaMensal: valorTotalPago,
            crescimentoMensal: 0
        };
    }
    static async getCarnesRecentesData(limit) {
        const carnes = await Carne_1.Carne.findAll({
            include: [
                { association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia'] },
                { association: 'plano', attributes: ['id', 'nome_plano'] },
                { association: 'banco', attributes: ['id', 'nome', 'tipo_banco'] }
            ],
            order: [['created_at', 'DESC']],
            limit
        });
        return carnes.map(carne => ({
            id: carne.id,
            numero_carne: carne.numero_carne,
            cliente: carne.cliente?.razao_social || 'N/A',
            valor_total: carne.valor_total,
            status: carne.status,
            data: carne.created_at.toLocaleDateString('pt-BR')
        }));
    }
    static async getParcelasVencidasData(limit) {
        const hoje = new Date();
        hoje.setHours(23, 59, 59, 999);
        const parcelas = await CarneParcela_1.CarneParcela.findAll({
            where: {
                data_vencimento: { [sequelize_1.Op.lte]: hoje },
                status: 'pendente'
            },
            include: [
                {
                    association: 'carne',
                    include: [
                        { association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia', 'email'] }
                    ]
                }
            ],
            order: [['data_vencimento', 'ASC']],
            limit
        });
        return parcelas.map(parcela => ({
            id: parcela.id,
            numero_parcela: parcela.numero_parcela,
            valor_parcela: parcela.valor_parcela,
            data_vencimento: parcela.data_vencimento,
            cliente: parcela.carne?.cliente?.razao_social || 'N/A',
            status: parcela.status
        }));
    }
    static async getStats(req, res) {
        try {
            const [totalClientes, clientesAtivos, totalPlanos, planosAtivos, totalBancos, bancosAtivos, totalCarnes, carnesAtivos, carnesPagos, carnesPendentes] = await Promise.all([
                Cliente_1.Cliente.count(),
                Cliente_1.Cliente.count({ where: { ativo: true } }),
                Plano_1.Plano.count(),
                Plano_1.Plano.count({ where: { status: 'ativo' } }),
                Banco_1.Banco.count(),
                Banco_1.Banco.count({ where: { ativo: true } }),
                Carne_1.Carne.count(),
                Carne_1.Carne.count({ where: { status: 'ativo' } }),
                Carne_1.Carne.count({ where: { status: 'pago' } }),
                Carne_1.Carne.count({ where: { status: 'pendente' } })
            ]);
            const carnes = await Carne_1.Carne.findAll({
                include: [{ association: 'parcelas' }]
            });
            let valorTotalCarnes = 0;
            let valorTotalPago = 0;
            let valorTotalPendente = 0;
            for (const carne of carnes) {
                const parcelas = await carne.getParcelas();
                const valorCarne = parcelas.reduce((total, parcela) => {
                    return total + parseFloat(parcela.valor_parcela.toString());
                }, 0);
                valorTotalCarnes += valorCarne;
                if (carne.status === 'pago') {
                    valorTotalPago += valorCarne;
                }
                else if (carne.status === 'pendente' || carne.status === 'ativo') {
                    valorTotalPendente += valorCarne;
                }
            }
            const stats = {
                total_clientes: totalClientes,
                clientes_ativos: clientesAtivos,
                total_planos: totalPlanos,
                planos_ativos: planosAtivos,
                total_bancos: totalBancos,
                bancos_ativos: bancosAtivos,
                total_carnes: totalCarnes,
                carnes_ativos: carnesAtivos,
                carnes_pagos: carnesPagos,
                carnes_pendentes: carnesPendentes,
                valor_total_carnes: valorTotalCarnes,
                valor_total_pago: valorTotalPago,
                valor_total_pendente: valorTotalPendente
            };
            res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            console.error('Erro ao obter estatísticas do dashboard:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
    static async getCarnesRecentes(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const carnes = await Carne_1.Carne.findAll({
                include: [
                    { association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia'] },
                    { association: 'plano', attributes: ['id', 'nome_plano'] },
                    { association: 'banco', attributes: ['id', 'nome', 'tipo_banco'] },
                    { association: 'parcelas', limit: 1, order: [['numero_parcela', 'ASC']] }
                ],
                order: [['created_at', 'DESC']],
                limit
            });
            res.json({
                success: true,
                data: carnes
            });
        }
        catch (error) {
            console.error('Erro ao obter carnês recentes:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
    static async getParcelasVencidas(req, res) {
        try {
            const hoje = new Date();
            hoje.setHours(23, 59, 59, 999);
            const parcelas = await CarneParcela_1.CarneParcela.findAll({
                where: {
                    data_vencimento: {
                        [sequelize_1.Op.lte]: hoje
                    },
                    status: 'pendente'
                },
                include: [
                    {
                        association: 'carne',
                        include: [
                            { association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia', 'email', 'telefone'] },
                            { association: 'plano', attributes: ['id', 'nome_plano'] },
                            { association: 'banco', attributes: ['id', 'nome', 'tipo_banco'] }
                        ]
                    }
                ],
                order: [['data_vencimento', 'ASC']]
            });
            res.json({
                success: true,
                data: parcelas
            });
        }
        catch (error) {
            console.error('Erro ao obter parcelas vencidas:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
    static async getParcelasProximasVencimento(req, res) {
        try {
            const hoje = new Date();
            const proximos7Dias = new Date();
            proximos7Dias.setDate(hoje.getDate() + 7);
            const parcelas = await CarneParcela_1.CarneParcela.findAll({
                where: {
                    data_vencimento: {
                        [sequelize_1.Op.between]: [hoje, proximos7Dias]
                    },
                    status: 'pendente'
                },
                include: [
                    {
                        association: 'carne',
                        include: [
                            { association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia', 'email', 'telefone'] },
                            { association: 'plano', attributes: ['id', 'nome_plano'] },
                            { association: 'banco', attributes: ['id', 'nome', 'tipo_banco'] }
                        ]
                    }
                ],
                order: [['data_vencimento', 'ASC']]
            });
            res.json({
                success: true,
                data: parcelas
            });
        }
        catch (error) {
            console.error('Erro ao obter parcelas próximas do vencimento:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
    static async getGraficoCarnesPorStatus(req, res) {
        try {
            const carnesPorStatus = await Carne_1.Carne.findAll({
                attributes: [
                    'status',
                    [Carne_1.Carne.sequelize.fn('COUNT', Carne_1.Carne.sequelize.col('id')), 'total']
                ],
                group: ['status'],
                raw: true
            });
            const dados = carnesPorStatus.map((item) => ({
                status: item.status,
                total: parseInt(item.total)
            }));
            res.json({
                success: true,
                data: dados
            });
        }
        catch (error) {
            console.error('Erro ao obter gráfico de carnês por status:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
    static async getGraficoClientesPorCidade(req, res) {
        try {
            const clientesPorCidade = await Cliente_1.Cliente.findAll({
                attributes: [
                    'cidade',
                    [Cliente_1.Cliente.sequelize.fn('COUNT', Cliente_1.Cliente.sequelize.col('id')), 'total']
                ],
                where: {
                    cidade: {
                        [sequelize_1.Op.ne]: null
                    }
                },
                group: ['cidade'],
                order: [[Cliente_1.Cliente.sequelize.fn('COUNT', Cliente_1.Cliente.sequelize.col('id')), 'DESC']],
                limit: 10,
                raw: true
            });
            const dados = clientesPorCidade.map((item) => ({
                cidade: item.cidade,
                total: parseInt(item.total)
            }));
            res.json({
                success: true,
                data: dados
            });
        }
        catch (error) {
            console.error('Erro ao obter gráfico de clientes por cidade:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
    static async getResumoMensal(req, res) {
        try {
            const { ano, mes } = req.query;
            const anoAtual = ano ? parseInt(ano) : new Date().getFullYear();
            const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1;
            const inicioMes = new Date(anoAtual, mesAtual - 1, 1);
            const fimMes = new Date(anoAtual, mesAtual, 0, 23, 59, 59, 999);
            const carnesCriados = await Carne_1.Carne.count({
                where: {
                    created_at: {
                        [sequelize_1.Op.between]: [inicioMes, fimMes]
                    }
                }
            });
            const parcelasPagas = await CarneParcela_1.CarneParcela.count({
                where: {
                    data_pagamento: {
                        [sequelize_1.Op.between]: [inicioMes, fimMes]
                    },
                    pago: true
                }
            });
            const parcelasPagasMes = await CarneParcela_1.CarneParcela.findAll({
                where: {
                    data_pagamento: {
                        [sequelize_1.Op.between]: [inicioMes, fimMes]
                    },
                    pago: true
                }
            });
            const valorTotalPago = parcelasPagasMes.reduce((total, parcela) => {
                return total + parseFloat(parcela.valor_pago?.toString() || parcela.valor_parcela.toString());
            }, 0);
            const clientesNovos = await Cliente_1.Cliente.count({
                where: {
                    created_at: {
                        [sequelize_1.Op.between]: [inicioMes, fimMes]
                    }
                }
            });
            const resumo = {
                mes: mesAtual,
                ano: anoAtual,
                carnes_criados: carnesCriados,
                parcelas_pagas: parcelasPagas,
                valor_total_pago: valorTotalPago,
                clientes_novos: clientesNovos
            };
            res.json({
                success: true,
                data: resumo
            });
        }
        catch (error) {
            console.error('Erro ao obter resumo mensal:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
}
exports.DashboardController = DashboardController;
//# sourceMappingURL=DashboardController.js.map