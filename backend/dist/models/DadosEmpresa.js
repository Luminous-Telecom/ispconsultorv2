"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DadosEmpresa = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class DadosEmpresa extends sequelize_1.Model {
}
exports.DadosEmpresa = DadosEmpresa;
DadosEmpresa.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    razao_social: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    nome_fantasia: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    cnpj: {
        type: sequelize_1.DataTypes.STRING(18),
        allowNull: false,
        unique: true
    },
    inscricao_estadual: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    inscricao_municipal: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    cep: {
        type: sequelize_1.DataTypes.STRING(9),
        allowNull: false
    },
    endereco: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    numero: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    complemento: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    bairro: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    cidade: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    estado: {
        type: sequelize_1.DataTypes.STRING(2),
        allowNull: false
    },
    telefone: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    celular: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    site: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    responsavel_nome: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    responsavel_cpf: {
        type: sequelize_1.DataTypes.STRING(14),
        allowNull: false
    },
    responsavel_cargo: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    logo: {
        type: sequelize_1.DataTypes.STRING,
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
    tableName: 'dados_empresa',
    timestamps: true,
    underscored: true
});
//# sourceMappingURL=DadosEmpresa.js.map