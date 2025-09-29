// Importar todos os modelos
import { Cliente } from './Cliente';
import { Plano } from './Plano';
import { Banco } from './Banco';
import { BancoConfiguracao } from './BancoConfiguracao';
import { Carne } from './Carne';
import { CarneParcela } from './CarneParcela';
import { Titulo } from './Titulo';
import { ClientePlano } from './ClientePlano';
import { DadosEmpresa } from './DadosEmpresa';
import { ScheduledRoutine } from './ScheduledRoutine';
import { RoutineExecutionLog } from './RoutineExecutionLog';

// Configurar relacionamentos

// Cliente
Cliente.belongsToMany(Plano, {
  through: ClientePlano,
  foreignKey: 'cliente_id',
  otherKey: 'plano_id',
  as: 'planos'
});

Cliente.hasMany(ClientePlano, {
  foreignKey: 'cliente_id',
  as: 'contratos'
});

Cliente.hasMany(Carne, {
  foreignKey: 'cliente_id',
  as: 'carnes'
});

Cliente.hasMany(Titulo, {
  foreignKey: 'cliente_id',
  as: 'titulos'
});

Cliente.belongsTo(Banco, {
  foreignKey: 'conta_boleto',
  as: 'bancoBoleto'
});

// Plano
Plano.belongsToMany(Cliente, {
  through: ClientePlano,
  foreignKey: 'plano_id',
  otherKey: 'cliente_id',
  as: 'clientes'
});

Plano.hasMany(ClientePlano, {
  foreignKey: 'plano_id',
  as: 'contratos'
});

Plano.hasMany(Carne, {
  foreignKey: 'plano_id',
  as: 'carnes'
});

Plano.hasMany(Titulo, {
  foreignKey: 'plano_id',
  as: 'titulos'
});

// Banco
Banco.hasMany(Cliente, {
  foreignKey: 'conta_boleto',
  as: 'clientes'
});

Banco.hasMany(Carne, {
  foreignKey: 'banco_id',
  as: 'carnes'
});

Banco.hasMany(Titulo, {
  foreignKey: 'banco_id',
  as: 'titulos'
});

Banco.hasMany(BancoConfiguracao, {
  foreignKey: 'banco_id',
  as: 'bancoConfiguracoes'
});

Banco.hasOne(BancoConfiguracao, {
  foreignKey: 'banco_id',
  as: 'configuracaoPrincipal'
});

// Carne
Carne.belongsTo(Cliente, {
  foreignKey: 'cliente_id',
  as: 'cliente'
});

Carne.belongsTo(Plano, {
  foreignKey: 'plano_id',
  as: 'plano'
});

Carne.belongsTo(Banco, {
  foreignKey: 'banco_id',
  as: 'banco'
});

Carne.hasMany(CarneParcela, {
  foreignKey: 'carne_id',
  as: 'parcelas'
});

// CarneParcela
CarneParcela.belongsTo(Carne, {
  foreignKey: 'carne_id',
  as: 'carne'
});

// Titulo
Titulo.belongsTo(Cliente, {
  foreignKey: 'cliente_id',
  as: 'cliente'
});

Titulo.belongsTo(Plano, {
  foreignKey: 'plano_id',
  as: 'plano'
});

Titulo.belongsTo(Banco, {
  foreignKey: 'banco_id',
  as: 'banco'
});

// ClientePlano
ClientePlano.belongsTo(Cliente, {
  foreignKey: 'cliente_id',
  as: 'cliente'
});

ClientePlano.belongsTo(Plano, {
  foreignKey: 'plano_id',
  as: 'plano'
});

// BancoConfiguracao
BancoConfiguracao.belongsTo(Banco, {
  foreignKey: 'banco_id',
  as: 'banco'
});

// ScheduledRoutine
ScheduledRoutine.hasMany(RoutineExecutionLog, {
  foreignKey: 'routine_id',
  as: 'executionLogs'
});

// RoutineExecutionLog
RoutineExecutionLog.belongsTo(ScheduledRoutine, {
  foreignKey: 'routine_id',
  as: 'routine'
});

// Exportar todos os modelos
export {
  Cliente,
  Plano,
  Banco,
  BancoConfiguracao,
  Carne,
  CarneParcela,
  Titulo,
  ClientePlano,
  DadosEmpresa,
  ScheduledRoutine,
  RoutineExecutionLog
};
