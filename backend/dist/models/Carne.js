"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Carne = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class Carne extends sequelize_1.Model {
    static async findAtivos() {
        return this.findAll({
            where: { status: 'ativo' },
            include: [
                { association: 'cliente' },
                { association: 'plano' },
                { association: 'banco' },
                { association: 'parcelas' }
            ],
            order: [['created_at', 'DESC']]
        });
    }
    static async findByStatus(status) {
        return this.findAll({
            where: { status },
            include: [
                { association: 'cliente' },
                { association: 'plano' },
                { association: 'banco' },
                { association: 'parcelas' }
            ],
            order: [['created_at', 'DESC']]
        });
    }
    async getValorParcela() {
        const parcelas = await this.getParcelas();
        if (parcelas.length > 0) {
            return parseFloat(parcelas[0].valor_parcela.toString());
        }
        const quantidadeParcelas = Math.max(1, this.quantidade_parcelas);
        return parseFloat(this.valor_total.toString()) / quantidadeParcelas;
    }
    async getParcelasPagasCount() {
        return this.countParcelas({
            where: { pago: true }
        });
    }
    async getValorTotalCarne() {
        const parcelas = await this.getParcelas();
        return parcelas.reduce((total, parcela) => {
            return total + parseFloat(parcela.valor_parcela.toString());
        }, 0);
    }
    async verificarEAtualizarStatus() {
        try {
            const parcelas = await this.getParcelas();
            const totalParcelas = parcelas.length;
            const parcelasPagas = parcelas.filter(p => p.pago).length;
            const parcelasCanceladas = parcelas.filter(p => p.status === 'cancelado').length;
            const parcelasVencidas = parcelas.filter(p => p.status === 'vencido').length;
            let novoStatus;
            if (parcelasPagas === totalParcelas && totalParcelas > 0) {
                novoStatus = 'pago';
            }
            else if (parcelasCanceladas === totalParcelas) {
                novoStatus = 'cancelado';
            }
            else if (parcelasVencidas > 0) {
                novoStatus = 'parcial';
            }
            else {
                novoStatus = 'pendente';
            }
            if (this.status !== novoStatus) {
                const statusAnterior = this.status;
                await this.update({ status: novoStatus });
                console.log('Status do carnê atualizado', {
                    carne_id: this.id,
                    status: `${statusAnterior} -> ${novoStatus}`,
                    parcelas_pagas: parcelasPagas,
                    total_parcelas: totalParcelas
                });
            }
        }
        catch (error) {
            console.error('Erro ao verificar status do carnê', {
                carne_id: this.id,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
    async gerarParcelas() {
        const parcelas = [];
        const valorParcela = await this.getValorParcela();
        for (let i = 1; i <= this.quantidade_parcelas; i++) {
            const dataVencimento = new Date(this.data_vencimento_primeira);
            dataVencimento.setMonth(dataVencimento.getMonth() + (i - 1));
            const parcela = await this.createParcela({
                carne_id: this.id,
                numero_parcela: i,
                valor_parcela: valorParcela,
                data_vencimento: dataVencimento,
                pago: false,
                status: 'pendente'
            });
            parcelas.push(parcela);
        }
        return parcelas;
    }
    async getResumo() {
        const parcelas = await this.getParcelas();
        const totalParcelas = parcelas.length;
        const parcelasPagas = parcelas.filter(p => p.pago).length;
        const parcelasPendentes = parcelas.filter(p => p.status === 'pendente').length;
        const parcelasVencidas = parcelas.filter(p => p.status === 'vencido').length;
        const parcelasCanceladas = parcelas.filter(p => p.status === 'cancelado').length;
        const valorTotal = parcelas.reduce((total, p) => total + parseFloat(p.valor_parcela.toString()), 0);
        const valorPago = parcelas.filter(p => p.pago).reduce((total, p) => total + parseFloat(p.valor_parcela.toString()), 0);
        const valorPendente = valorTotal - valorPago;
        const percentualPago = totalParcelas > 0 ? (parcelasPagas / totalParcelas) * 100 : 0;
        return {
            total_parcelas: totalParcelas,
            parcelas_pagas: parcelasPagas,
            parcelas_pendentes: parcelasPendentes,
            parcelas_vencidas: parcelasVencidas,
            parcelas_canceladas: parcelasCanceladas,
            valor_total: valorTotal,
            valor_pago: valorPago,
            valor_pendente: valorPendente,
            percentual_pago: percentualPago
        };
    }
}
exports.Carne = Carne;
Carne.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    cliente_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'clientes',
            key: 'id'
        }
    },
    plano_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'planos',
            key: 'id'
        }
    },
    banco_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'bancos',
            key: 'id'
        }
    },
    numero_carne: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    carnet_id: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true
    },
    valor_total: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0.01
        }
    },
    quantidade_parcelas: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 60
        }
    },
    data_vencimento_primeira: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('ativo', 'pago', 'cancelado', 'parcial', 'pendente'),
        allowNull: false,
        defaultValue: 'ativo'
    },
    observacoes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    codigo_barras: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    linha_digitavel: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    }
}, {
    sequelize: database_1.sequelize,
    modelName: 'Carne',
    tableName: 'carnes',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['numero_carne']
        },
        {
            fields: ['status']
        },
        {
            fields: ['cliente_id']
        },
        {
            fields: ['plano_id']
        },
        {
            fields: ['banco_id']
        },
        {
            fields: ['data_vencimento_primeira']
        }
    ]
});
//# sourceMappingURL=Carne.js.map