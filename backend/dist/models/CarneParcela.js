"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarneParcela = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class CarneParcela extends sequelize_1.Model {
    static async findPendentes() {
        return this.findAll({
            where: { status: 'pendente' },
            include: [{ association: 'carne' }],
            order: [['data_vencimento', 'ASC']]
        });
    }
    static async findVencidas() {
        return this.findAll({
            where: { status: 'vencido' },
            include: [{ association: 'carne' }],
            order: [['data_vencimento', 'ASC']]
        });
    }
    static async findPagas() {
        return this.findAll({
            where: { status: 'pago' },
            include: [{ association: 'carne' }],
            order: [['data_pagamento', 'DESC']]
        });
    }
    static async findVencidasHoje() {
        const hoje = new Date();
        hoje.setHours(23, 59, 59, 999);
        return this.findAll({
            where: {
                data_vencimento: {
                    [sequelize_1.Op.lte]: hoje
                },
                status: 'pendente'
            },
            include: [{ association: 'carne' }],
            order: [['data_vencimento', 'ASC']]
        });
    }
    async marcarComoPago(valorPago, dataPagamento) {
        const valor = valorPago || this.valor_parcela;
        const data = dataPagamento || new Date();
        await this.update({
            pago: true,
            data_pagamento: data,
            valor_pago: valor,
            status: 'pago'
        });
        const carne = await this.getCarne();
        await carne.verificarEAtualizarStatus();
    }
    async desmarcarPago() {
        await this.update({
            pago: false,
            data_pagamento: null,
            valor_pago: null,
            status: 'pendente'
        });
        const carne = await this.getCarne();
        await carne.verificarEAtualizarStatus();
    }
    async marcarComoVencida() {
        if (this.status === 'pendente') {
            await this.update({
                status: 'vencido'
            });
            const carne = await this.getCarne();
            await carne.verificarEAtualizarStatus();
        }
    }
    async cancelar() {
        await this.update({
            status: 'cancelado'
        });
        const carne = await this.getCarne();
        await carne.verificarEAtualizarStatus();
    }
    async isVencida() {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataVencimento = new Date(this.data_vencimento);
        dataVencimento.setHours(0, 0, 0, 0);
        return dataVencimento < hoje && this.status === 'pendente';
    }
    async getDiasAteVencimento() {
        const hoje = new Date();
        const dataVencimento = new Date(this.data_vencimento);
        const diferenca = dataVencimento.getTime() - hoje.getTime();
        const dias = Math.ceil(diferenca / (1000 * 60 * 60 * 24));
        return dias;
    }
    async getDiasAtraso() {
        if (!this.isVencida()) {
            return 0;
        }
        const hoje = new Date();
        const dataVencimento = new Date(this.data_vencimento);
        const diferenca = hoje.getTime() - dataVencimento.getTime();
        const dias = Math.ceil(diferenca / (1000 * 60 * 60 * 24));
        return dias;
    }
    async calcularValorComMultaJuros(banco) {
        let valor = parseFloat(this.valor_parcela.toString());
        if (this.status === 'pago') {
            return valor;
        }
        if (!this.isVencida() || !banco) {
            return valor;
        }
        const diasAtraso = await this.getDiasAtraso();
        if (diasAtraso > 0) {
            if (banco.percentual_multa) {
                const multa = valor * (banco.percentual_multa / 100);
                valor += multa;
            }
            if (banco.percentual_juros) {
                const juros = valor * (banco.percentual_juros / 100) * diasAtraso;
                valor += juros;
            }
        }
        return Math.round(valor * 100) / 100;
    }
    async gerarCodigoBarras() {
        const carne = await this.getCarne();
        const banco = await carne.getBanco();
        return `${banco?.codigo || '000'}${this.id.toString().padStart(10, '0')}`;
    }
    async gerarLinhaDigitavel() {
        const codigoBarras = await this.gerarCodigoBarras();
        const linha = codigoBarras.replace(/(\d{5})(\d{5})(\d{5})(\d{6})(\d{5})(\d{6})(\d{1})(\d{14})/, '$1.$2 $3.$4 $5.$6 $7 $8');
        return linha;
    }
    async getResumo() {
        const carne = await this.getCarne();
        const banco = await carne.getBanco();
        const valorAtual = await this.calcularValorComMultaJuros(banco);
        const diasVencimento = await this.getDiasAteVencimento();
        const diasAtraso = await this.getDiasAtraso();
        const codigoBarras = this.codigo_barras || await this.gerarCodigoBarras();
        const linhaDigitavel = this.linha_digitavel || await this.gerarLinhaDigitavel();
        return {
            numero_parcela: this.numero_parcela,
            valor_original: parseFloat(this.valor_parcela.toString()),
            valor_atual: valorAtual,
            data_vencimento: this.data_vencimento,
            status: this.status,
            pago: this.pago,
            data_pagamento: this.data_pagamento,
            dias_vencimento: diasVencimento,
            dias_atraso: diasAtraso,
            valor_multa_juros: valorAtual - parseFloat(this.valor_parcela.toString()),
            codigo_barras: codigoBarras,
            linha_digitavel: linhaDigitavel,
            url_boleto: this.url_boleto
        };
    }
}
exports.CarneParcela = CarneParcela;
CarneParcela.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    carne_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'carnes',
            key: 'id'
        }
    },
    numero_parcela: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1
        }
    },
    valor_parcela: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0.01
        }
    },
    tipo: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'normal'
    },
    data_vencimento: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false
    },
    pago: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    data_pagamento: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    valor_pago: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('pendente', 'pago', 'vencido', 'cancelado'),
        allowNull: false,
        defaultValue: 'pendente'
    },
    codigo_barras: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    linha_digitavel: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    qrcode: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    qrcode_image: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true
    },
    observacoes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    charge_id: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true
    },
    url_boleto: {
        type: sequelize_1.DataTypes.STRING(500),
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
    modelName: 'CarneParcela',
    tableName: 'carne_parcelas',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['carne_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['data_vencimento']
        },
        {
            fields: ['pago']
        },
        {
            fields: ['carne_id', 'numero_parcela'],
            unique: true
        }
    ]
});
//# sourceMappingURL=CarneParcela.js.map