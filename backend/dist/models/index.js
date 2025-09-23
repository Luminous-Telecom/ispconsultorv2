"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DadosEmpresa = exports.ClientePlano = exports.CarneParcela = exports.Carne = exports.BancoConfiguracao = exports.Banco = exports.Plano = exports.Cliente = void 0;
const Cliente_1 = require("./Cliente");
Object.defineProperty(exports, "Cliente", { enumerable: true, get: function () { return Cliente_1.Cliente; } });
const Plano_1 = require("./Plano");
Object.defineProperty(exports, "Plano", { enumerable: true, get: function () { return Plano_1.Plano; } });
const Banco_1 = require("./Banco");
Object.defineProperty(exports, "Banco", { enumerable: true, get: function () { return Banco_1.Banco; } });
const BancoConfiguracao_1 = require("./BancoConfiguracao");
Object.defineProperty(exports, "BancoConfiguracao", { enumerable: true, get: function () { return BancoConfiguracao_1.BancoConfiguracao; } });
const Carne_1 = require("./Carne");
Object.defineProperty(exports, "Carne", { enumerable: true, get: function () { return Carne_1.Carne; } });
const CarneParcela_1 = require("./CarneParcela");
Object.defineProperty(exports, "CarneParcela", { enumerable: true, get: function () { return CarneParcela_1.CarneParcela; } });
const ClientePlano_1 = require("./ClientePlano");
Object.defineProperty(exports, "ClientePlano", { enumerable: true, get: function () { return ClientePlano_1.ClientePlano; } });
const DadosEmpresa_1 = require("./DadosEmpresa");
Object.defineProperty(exports, "DadosEmpresa", { enumerable: true, get: function () { return DadosEmpresa_1.DadosEmpresa; } });
Cliente_1.Cliente.belongsToMany(Plano_1.Plano, {
    through: ClientePlano_1.ClientePlano,
    foreignKey: 'cliente_id',
    otherKey: 'plano_id',
    as: 'planos'
});
Cliente_1.Cliente.hasMany(ClientePlano_1.ClientePlano, {
    foreignKey: 'cliente_id',
    as: 'contratos'
});
Cliente_1.Cliente.hasMany(Carne_1.Carne, {
    foreignKey: 'cliente_id',
    as: 'carnes'
});
Cliente_1.Cliente.belongsTo(Banco_1.Banco, {
    foreignKey: 'conta_boleto',
    as: 'bancoBoleto'
});
Plano_1.Plano.belongsToMany(Cliente_1.Cliente, {
    through: ClientePlano_1.ClientePlano,
    foreignKey: 'plano_id',
    otherKey: 'cliente_id',
    as: 'clientes'
});
Plano_1.Plano.hasMany(ClientePlano_1.ClientePlano, {
    foreignKey: 'plano_id',
    as: 'contratos'
});
Plano_1.Plano.hasMany(Carne_1.Carne, {
    foreignKey: 'plano_id',
    as: 'carnes'
});
Banco_1.Banco.hasMany(Cliente_1.Cliente, {
    foreignKey: 'conta_boleto',
    as: 'clientes'
});
Banco_1.Banco.hasMany(Carne_1.Carne, {
    foreignKey: 'banco_id',
    as: 'carnes'
});
Banco_1.Banco.hasMany(BancoConfiguracao_1.BancoConfiguracao, {
    foreignKey: 'banco_id',
    as: 'bancoConfiguracoes'
});
Banco_1.Banco.hasOne(BancoConfiguracao_1.BancoConfiguracao, {
    foreignKey: 'banco_id',
    as: 'configuracaoPrincipal'
});
Carne_1.Carne.belongsTo(Cliente_1.Cliente, {
    foreignKey: 'cliente_id',
    as: 'cliente'
});
Carne_1.Carne.belongsTo(Plano_1.Plano, {
    foreignKey: 'plano_id',
    as: 'plano'
});
Carne_1.Carne.belongsTo(Banco_1.Banco, {
    foreignKey: 'banco_id',
    as: 'banco'
});
Carne_1.Carne.hasMany(CarneParcela_1.CarneParcela, {
    foreignKey: 'carne_id',
    as: 'parcelas'
});
CarneParcela_1.CarneParcela.belongsTo(Carne_1.Carne, {
    foreignKey: 'carne_id',
    as: 'carne'
});
ClientePlano_1.ClientePlano.belongsTo(Cliente_1.Cliente, {
    foreignKey: 'cliente_id',
    as: 'cliente'
});
ClientePlano_1.ClientePlano.belongsTo(Plano_1.Plano, {
    foreignKey: 'plano_id',
    as: 'plano'
});
BancoConfiguracao_1.BancoConfiguracao.belongsTo(Banco_1.Banco, {
    foreignKey: 'banco_id',
    as: 'banco'
});
//# sourceMappingURL=index.js.map