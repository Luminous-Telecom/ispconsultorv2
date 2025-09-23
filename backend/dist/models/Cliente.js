"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cliente = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class Cliente extends sequelize_1.Model {
    static async findAtivos() {
        return this.findAll({
            where: { ativo: true },
            order: [['razao_social', 'ASC']]
        });
    }
    static async findByCnpj(cnpj) {
        return this.findOne({
            where: { cnpj },
            include: [
                { association: 'carnes', include: ['parcelas'] },
                { association: 'planos' },
                { association: 'contratos' },
                { association: 'bancoBoleto' }
            ]
        });
    }
    async getTotalCarnes() {
        return this.countCarnes();
    }
    async getCarnesAtivos() {
        return this.getCarnes({
            where: { status: 'ativo' }
        });
    }
    async getCarnesPagados() {
        return this.getCarnes({
            where: { status: 'pago' }
        });
    }
    async getCarnesPendentes() {
        return this.getCarnes({
            where: { status: 'pendente' }
        });
    }
}
exports.Cliente = Cliente;
Cliente.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    cnpj: {
        type: sequelize_1.DataTypes.STRING(18),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            len: [14, 18]
        }
    },
    razao_social: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [2, 255]
        }
    },
    nome_fantasia: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        validate: {
            isEmail: true,
            notEmpty: true
        }
    },
    telefone: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true
    },
    whatsapp: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true
    },
    cep: {
        type: sequelize_1.DataTypes.STRING(10),
        allowNull: true
    },
    endereco: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    numero: {
        type: sequelize_1.DataTypes.STRING(10),
        allowNull: true
    },
    complemento: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true
    },
    bairro: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true
    },
    cidade: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true
    },
    estado: {
        type: sequelize_1.DataTypes.STRING(2),
        allowNull: true,
        validate: {
            len: [2, 2]
        }
    },
    observacoes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    ativo: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    tipo_cobranca: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true
    },
    valor_primeiro_titulo: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    isento_mensalidade: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    recebe_email: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    recebe_sms: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    recebe_whatsapp: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    dia_vencimento: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1,
            max: 31
        }
    },
    conta_boleto: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'bancos',
            key: 'id'
        }
    },
    data_validade_desconto: {
        type: sequelize_1.DataTypes.DATE,
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
    modelName: 'Cliente',
    tableName: 'clientes',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['cnpj']
        },
        {
            fields: ['ativo']
        },
        {
            fields: ['cidade']
        },
        {
            fields: ['estado']
        },
        {
            fields: ['razao_social']
        }
    ]
});
//# sourceMappingURL=Cliente.js.map