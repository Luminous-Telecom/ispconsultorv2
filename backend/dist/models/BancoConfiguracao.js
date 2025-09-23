"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BancoConfiguracao = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class BancoConfiguracao extends sequelize_1.Model {
    static async findAtivas() {
        return this.findAll({
            where: { ativo: true },
            include: [{ association: 'banco' }],
            order: [['created_at', 'ASC']]
        });
    }
    static async findByTipo(tipoBanco) {
        return this.findAll({
            where: {
                tipo_banco: tipoBanco,
                ativo: true
            },
            include: [{ association: 'banco' }],
            order: [['created_at', 'ASC']]
        });
    }
    async getConfiguracaoPorChave(chave) {
        return this.configuracao[chave];
    }
    async setConfiguracaoPorChave(chave, valor) {
        const config = { ...this.configuracao };
        config[chave] = valor;
        await this.update({ configuracao: config });
    }
    async removeConfiguracaoPorChave(chave) {
        const config = { ...this.configuracao };
        delete config[chave];
        await this.update({ configuracao: config });
    }
    async validarConfiguracao() {
        const erros = [];
        switch (this.tipo_banco) {
            case 'efi':
                if (!this.configuracao.client_id) {
                    erros.push('Client ID é obrigatório para Efi');
                }
                if (!this.configuracao.client_secret) {
                    erros.push('Client Secret é obrigatório para Efi');
                }
                if (this.configuracao.sandbox === undefined) {
                    erros.push('Configuração de sandbox é obrigatória para Efi');
                }
                break;
            case 'asaas':
                if (!this.configuracao.access_token) {
                    erros.push('Access Token é obrigatório para Asaas');
                }
                if (!this.configuracao.webhook_token) {
                    erros.push('Webhook Token é obrigatório para Asaas');
                }
                if (this.configuracao.sandbox === undefined) {
                    erros.push('Configuração de sandbox é obrigatória para Asaas');
                }
                break;
            default:
                erros.push(`Tipo de banco ${this.tipo_banco} não suportado`);
        }
        return {
            valida: erros.length === 0,
            erros
        };
    }
}
exports.BancoConfiguracao = BancoConfiguracao;
BancoConfiguracao.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    banco_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'bancos',
            key: 'id'
        }
    },
    tipo_banco: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    configuracao: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: {}
    },
    ativo: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
    modelName: 'BancoConfiguracao',
    tableName: 'banco_configuracoes',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['banco_id']
        },
        {
            fields: ['tipo_banco']
        },
        {
            fields: ['ativo']
        },
        {
            fields: ['banco_id', 'tipo_banco']
        }
    ]
});
//# sourceMappingURL=BancoConfiguracao.js.map