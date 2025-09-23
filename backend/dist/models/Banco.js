"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Banco = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class Banco extends sequelize_1.Model {
    static async findAtivos() {
        return this.findAll({
            where: { ativo: true },
            order: [['nome', 'ASC']]
        });
    }
    static async findByTipo(tipoBanco) {
        return this.findAll({
            where: {
                tipo_banco: tipoBanco,
                ativo: true
            },
            order: [['nome', 'ASC']]
        });
    }
    async getUrlPadrao() {
        const urlsPadrao = {
            efi: 'https://api-pix-h.efipay.com.br',
            asaas: 'https://www.asaas.com/api/v3',
            bancario: '',
            outros: ''
        };
        return this.api_url || urlsPadrao[this.tipo_banco] || '';
    }
    async testarConexao() {
        try {
            switch (this.tipo_banco) {
                case 'efi':
                    return await this.testarConexaoEfi();
                case 'asaas':
                    return await this.testarConexaoAsaas();
                default:
                    return {
                        sucesso: false,
                        mensagem: 'Tipo de banco não suportado para teste de conexão'
                    };
            }
        }
        catch (error) {
            return {
                sucesso: false,
                mensagem: `Erro ao testar conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
            };
        }
    }
    async testarConexaoEfi() {
        if (!this.client_id_producao || !this.client_secret_producao) {
            return {
                sucesso: false,
                mensagem: 'Client ID e Client Secret são obrigatórios para Efi'
            };
        }
        return {
            sucesso: true,
            mensagem: 'Conexão com Efi configurada com sucesso',
            dados: {
                sandbox: this.sandbox,
                url: await this.getUrlPadrao()
            }
        };
    }
    async testarConexaoAsaas() {
        if (!this.api_key) {
            return {
                sucesso: false,
                mensagem: 'Access Token é obrigatório para Asaas'
            };
        }
        return {
            sucesso: true,
            mensagem: 'Conexão com Asaas configurada com sucesso',
            dados: {
                sandbox: this.sandbox,
                url: await this.getUrlPadrao()
            }
        };
    }
    async aplicarConfiguracoesPadrao() {
        const configuracoesPadrao = {
            efi: {
                percentual_multa: 2.00,
                percentual_juros: 1.00,
                contra_apresentacao: false,
                recalcular_segunda_via: true,
                maximo_dias_recalcular: 30,
                exibir_mes_referente: true,
                incluir_taxa: true,
                taxa_cobranca: 3.50
            },
            asaas: {
                percentual_multa: 2.00,
                percentual_juros: 1.00,
                contra_apresentacao: false,
                recalcular_segunda_via: true,
                maximo_dias_recalcular: 30,
                exibir_mes_referente: true,
                incluir_taxa: true,
                taxa_cobranca: 3.50
            },
            bancario: {
                percentual_multa: 2.00,
                percentual_juros: 1.00,
                contra_apresentacao: true,
                recalcular_segunda_via: false,
                exibir_mes_referente: false,
                incluir_taxa: false
            },
            outros: {
                percentual_multa: 2.00,
                percentual_juros: 1.00,
                contra_apresentacao: false,
                recalcular_segunda_via: false,
                exibir_mes_referente: false,
                incluir_taxa: false
            }
        };
        const config = configuracoesPadrao[this.tipo_banco];
        if (config) {
            Object.assign(this, config);
        }
    }
}
exports.Banco = Banco;
Banco.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [2, 255]
        }
    },
    codigo: {
        type: sequelize_1.DataTypes.STRING(10),
        allowNull: true
    },
    descricao: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    ativo: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    tipo_banco: {
        type: sequelize_1.DataTypes.ENUM('efi', 'asaas', 'bancario', 'outros'),
        allowNull: false,
        defaultValue: 'bancario'
    },
    api_url: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true
    },
    api_key: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    api_secret: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    sandbox: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    identificador_conta: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true
    },
    client_id_producao: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    client_secret_producao: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    url_retorno: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true
    },
    repassar_email_cliente: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    percentual_multa: {
        type: sequelize_1.DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 2.00
    },
    percentual_juros: {
        type: sequelize_1.DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 1.00
    },
    desconto_tipo: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true
    },
    desconto_valor: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    contra_apresentacao: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    recalcular_segunda_via: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    maximo_dias_recalcular: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 30
    },
    layout_web: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    layout_pdf: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    layout_carne: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    local_pagamento: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    dados_avalista: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    exibir_mes_referente: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    documento_cpf_cnpj: {
        type: sequelize_1.DataTypes.STRING(18),
        allowNull: true
    },
    taxa_cobranca: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    incluir_taxa: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    observacao_linha_1: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    observacao_linha_2: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    observacao_linha_3: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    observacao_linha_4: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    instrucao_linha_1: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    instrucao_linha_2: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    instrucao_linha_3: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    instrucao_linha_4: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    instrucao_linha_5: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    configuracoes: {
        type: sequelize_1.DataTypes.JSON,
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
    modelName: 'Banco',
    tableName: 'bancos',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['ativo']
        },
        {
            fields: ['tipo_banco']
        },
        {
            fields: ['nome']
        }
    ],
    hooks: {
        beforeCreate: async (banco) => {
            await banco.aplicarConfiguracoesPadrao();
        }
    }
});
//# sourceMappingURL=Banco.js.map