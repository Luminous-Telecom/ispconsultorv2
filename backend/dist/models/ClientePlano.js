"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientePlano = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class ClientePlano extends sequelize_1.Model {
    static async findAtivos() {
        return this.findAll({
            where: { status: 'ativo' },
            include: [
                { association: 'cliente' },
                { association: 'plano' }
            ],
            order: [['created_at', 'DESC']]
        });
    }
    async getValorFinal() {
        if (this.valor_final) {
            return parseFloat(this.valor_final.toString());
        }
        const plano = await this.getPlano();
        let valor = parseFloat(plano.valor_mensal.toString());
        if (this.desconto_percentual && this.desconto_percentual > 0) {
            valor = valor * (1 - this.desconto_percentual / 100);
        }
        if (this.desconto_valor && this.desconto_valor > 0) {
            valor = Math.max(0, valor - this.desconto_valor);
        }
        return valor;
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
exports.ClientePlano = ClientePlano;
ClientePlano.init({
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
    valor_final: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true
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
    modelName: 'ClientePlano',
    tableName: 'cliente_planos',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['cliente_id']
        },
        {
            fields: ['plano_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['cliente_id', 'plano_id'],
            unique: true
        }
    ]
});
//# sourceMappingURL=ClientePlano.js.map