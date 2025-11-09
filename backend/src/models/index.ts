// Importar todos os modelos
import { Cliente } from './Cliente';
import { Plano } from './Plano';
import { Banco } from './Banco';
import { BancoConfiguracao } from './BancoConfiguracao';
import { Titulo } from './Titulo';
import { Contrato } from './Contrato';
import { DadosEmpresa } from './DadosEmpresa';
import { ScheduledRoutine } from './ScheduledRoutine';
import { RoutineExecutionLog } from './RoutineExecutionLog';
import { ServidorEmail } from './ServidorEmail';
import { ServidorWhatsApp } from './ServidorWhatsApp';
import { ModeloContrato } from './ModeloContrato';
import { ModeloRecibo } from './ModeloRecibo';
import { ModeloCarta } from './ModeloCarta';
import { DiasVencimento } from './DiasVencimento';
import { TermoContrato } from './TermoContrato';
import { ModeloTermo } from './ModeloTermo';
import { Usuario } from './Usuario';

// Importar associações específicas
import './associations';

// Configurar relacionamentos

// Cliente
Cliente.belongsToMany(Plano, {
  through: Contrato,
  foreignKey: 'cliente_id',
  otherKey: 'plano_id',
  as: 'planos'
});

Cliente.hasMany(Contrato, {
  foreignKey: 'cliente_id',
  as: 'contratos'
});


Cliente.hasMany(Titulo, {
  foreignKey: 'cliente_id',
  as: 'titulos'
});

// Plano
Plano.belongsToMany(Cliente, {
  through: Contrato,
  foreignKey: 'plano_id',
  otherKey: 'cliente_id',
  as: 'clientes'
});

Plano.hasMany(Contrato, {
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

// Contrato
Contrato.belongsTo(Cliente, {
  foreignKey: 'cliente_id',
  as: 'cliente'
});

Contrato.belongsTo(Plano, {
  foreignKey: 'plano_id',
  as: 'plano'
});

Contrato.belongsTo(Banco, {
  foreignKey: 'conta_boleto',
  as: 'bancoBoleto'
});

// TermoContrato
Contrato.hasMany(TermoContrato, {
  foreignKey: 'contrato_id',
  as: 'termos'
});

TermoContrato.belongsTo(Contrato, {
  foreignKey: 'contrato_id',
  as: 'contrato'
});

TermoContrato.belongsTo(ModeloTermo, {
  foreignKey: 'modelo_termo_id',
  as: 'modeloTermo'
});

ModeloTermo.hasMany(TermoContrato, {
  foreignKey: 'modelo_termo_id',
  as: 'termosContrato'
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
  Contrato,
  DadosEmpresa,
  ScheduledRoutine,
  RoutineExecutionLog,
  ServidorEmail,
  ServidorWhatsApp,
  ModeloContrato,
  ModeloRecibo,
  ModeloCarta,
  DiasVencimento,
  TermoContrato,
  ModeloTermo,
  Usuario
};
