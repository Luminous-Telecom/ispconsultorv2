"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Plano = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class Plano extends sequelize_1.Model {
    static async findAtivos() {
        return this.findAll({
            where: { status: 'ativo' },
            order: [['nome_plano', 'ASC']]
        });
    }
    static async findByTipoServico(tipoServico) {
        return this.findAll({
            where: {
                tipo_servico: tipoServico,
                status: 'ativo'
            },
            order: [['nome_plano', 'ASC']]
        });
    }
    async getValorComDesconto() {
        if (!this.desconto_ativo) {
            return this.valor_mensal;
        }
        if (this.desconto_percentual && this.desconto_percentual > 0) {
            return this.valor_mensal * (1 - this.desconto_percentual / 100);
        }
        if (this.desconto_valor && this.desconto_valor > 0) {
            return Math.max(0, this.valor_mensal - this.desconto_valor);
        }
        return this.valor_mensal;
    }
    async getTotalClientes() {
        return this.countClientes();
    }
    async getClientesAtivos() {
        return this.getClientes({
            where: { ativo: true }
        });
    }
    async getCarnesAtivos() {
        return this.getCarnes({
            where: { status: 'ativo' }
        });
    }
    async isVigente() {
        const agora = new Date();
        if (this.data_inicio && this.data_inicio > agora) {
            return false;
        }
        if (this.data_fim && this.data_fim < agora) {
            return false;
        }
        return this.status === 'ativo';
    }
    async getDiasRestantes() {
        if (!this.data_fim) {
            return null;
        }
        const agora = new Date();
        const diferenca = this.data_fim.getTime() - agora.getTime();
        const dias = Math.ceil(diferenca / (1000 * 60 * 60 * 24));
        return dias > 0 ? dias : 0;
    }
}
exports.Plano = Plano;
Plano.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome_plano: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [2, 255]
        }
    },
    descricao: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    tipo_servico: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true
    },
    servicos_inclusos: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true
    },
    quantidade_usuarios: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1
        }
    },
    valor_mensal: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    desconto_percentual: {
        type: sequelize_1.DataTypes.DECIMAL(5, 2),
        allowNull: true,
        validate: {
            min: 0,
            max: 100
        }
    },
    desconto_valor: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true,
        validate: {
            min: 0
        }
    },
    desconto_ativo: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    periodicidade: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'mensal'
    },
    renovacao_automatica: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    data_inicio: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    data_fim: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('ativo', 'inativo', 'suspenso'),
        allowNull: false,
        defaultValue: 'ativo'
    },
    observacoes: {
        type: sequelize_1.DataTypes.TEXT,
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
    modelName: 'Plano',
    tableName: 'planos',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['status']
        },
        {
            fields: ['tipo_servico']
        },
        {
            fields: ['nome_plano']
        },
        {
            fields: ['data_inicio']
        },
        {
            fields: ['data_fim']
        }
    ]
});
//# sourceMappingURL=Plano.js.map