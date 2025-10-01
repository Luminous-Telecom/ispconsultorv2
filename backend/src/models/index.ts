// Importar todos os modelos
import { Cliente } from './Cliente';
import { Plano } from './Plano';
import { Banco } from './Banco';
import { BancoConfiguracao } from './BancoConfiguracao';
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


Cliente.hasMany(Titulo, {
  foreignKey: 'cliente_id',
  as: 'titulos'
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

Plano.hasMany(Titulo, {
  foreignKey: 'plano_id',
  as: 'titulos'
});

// Banco


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

ClientePlano.belongsTo(Banco, {
  foreignKey: 'conta_boleto',
  as: 'bancoBoleto'
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
  Titulo,
  ClientePlano,
  DadosEmpresa,
  ScheduledRoutine,
  RoutineExecutionLog
};
