// Importar todos os modelos
import { Cliente } from './Cliente';
import { Plano } from './Plano';
import { Banco } from './Banco';
import { Titulo } from './Titulo';
import { Contrato } from './Contrato';
import { DadosEmpresa } from './DadosEmpresa';
import { ScheduledRoutine } from './ScheduledRoutine';
import { RoutineExecutionLog } from './RoutineExecutionLog';
import { ServidorEmail } from './ServidorEmail';
import { ServidorWhatsApp } from './ServidorWhatsApp';
import { ModeloDocumento } from './ModeloDocumento';
import { DiasVencimento } from './DiasVencimento';
import { TermoContrato } from './TermoContrato';
import { ModeloTermo } from './ModeloTermo';
import { Usuario } from './Usuario';
import { ContratoPlanoAdicional } from './ContratoPlanoAdicional';
import { Auditoria } from './Auditoria';
import { AssinaturaDigital } from './AssinaturaDigital';
import { ClienteArquivo } from './ClienteArquivo';
import AssinaturaDigitalProvider from './AssinaturaDigitalProvider';
import { Fornecedor } from './Fornecedor';
import { FornecedorContato } from './FornecedorContato';
import { FornecedorArquivo } from './FornecedorArquivo';
import { FornecedorHistorico } from './FornecedorHistorico';
import { ContaPagar } from './ContaPagar';
import { ContaPagarArquivo } from './ContaPagarArquivo';
import { ContaPagarPagamento } from './ContaPagarPagamento';
//
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

// ContratoPlanoAdicional
Contrato.hasMany(ContratoPlanoAdicional, {
  foreignKey: 'contrato_id',
  as: 'planosAdicionais'
});

ContratoPlanoAdicional.belongsTo(Contrato, {
  foreignKey: 'contrato_id',
  as: 'contrato'
});

ContratoPlanoAdicional.belongsTo(Plano, {
  foreignKey: 'plano_id',
  as: 'plano'
});

Plano.hasMany(ContratoPlanoAdicional, {
  foreignKey: 'plano_id',
  as: 'contratosAdicionais'
});

TermoContrato.belongsTo(ModeloDocumento, {
  foreignKey: 'modelo_documento_id',
  as: 'modeloDocumento'
});

ModeloDocumento.hasMany(TermoContrato, {
  foreignKey: 'modelo_documento_id',
  as: 'termosContrato'
});

// AssinaturaDigital
TermoContrato.hasMany(AssinaturaDigital, {
  foreignKey: 'termo_contrato_id',
  as: 'assinaturas'
});

AssinaturaDigital.belongsTo(TermoContrato, {
  foreignKey: 'termo_contrato_id',
  as: 'termoContrato'
});

Cliente.hasMany(AssinaturaDigital, {
  foreignKey: 'cliente_id',
  as: 'assinaturas'
});

AssinaturaDigital.belongsTo(Cliente, {
  foreignKey: 'cliente_id',
  as: 'cliente'
});

// ClienteArquivo
Cliente.hasMany(ClienteArquivo, {
  foreignKey: 'cliente_id',
  as: 'arquivos'
});

ClienteArquivo.belongsTo(Cliente, {
  foreignKey: 'cliente_id',
  as: 'cliente'
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

// Auditoria
Usuario.hasMany(Auditoria, {
  foreignKey: 'usuario_id',
  as: 'auditorias'
});

Auditoria.belongsTo(Usuario, {
  foreignKey: 'usuario_id',
  as: 'usuario'
});

// Fornecedor
Fornecedor.hasMany(FornecedorContato, {
  foreignKey: 'fornecedor_id',
  as: 'contatos'
});

FornecedorContato.belongsTo(Fornecedor, {
  foreignKey: 'fornecedor_id',
  as: 'fornecedor'
});

Fornecedor.hasMany(FornecedorArquivo, {
  foreignKey: 'fornecedor_id',
  as: 'arquivos'
});

FornecedorArquivo.belongsTo(Fornecedor, {
  foreignKey: 'fornecedor_id',
  as: 'fornecedor'
});

Fornecedor.hasMany(FornecedorHistorico, {
  foreignKey: 'fornecedor_id',
  as: 'historicos'
});

FornecedorHistorico.belongsTo(Fornecedor, {
  foreignKey: 'fornecedor_id',
  as: 'fornecedor'
});

FornecedorHistorico.belongsTo(Usuario, {
  foreignKey: 'usuario_id',
  as: 'usuario'
});

// ContaPagar
Fornecedor.hasMany(ContaPagar, {
  foreignKey: 'fornecedor_id',
  as: 'contasPagar'
});

ContaPagar.belongsTo(Fornecedor, {
  foreignKey: 'fornecedor_id',
  as: 'fornecedor'
});

ContaPagar.hasMany(ContaPagarArquivo, {
  foreignKey: 'conta_pagar_id',
  as: 'arquivos'
});

ContaPagarArquivo.belongsTo(ContaPagar, {
  foreignKey: 'conta_pagar_id',
  as: 'contaPagar'
});

ContaPagar.hasMany(ContaPagarPagamento, {
  foreignKey: 'conta_pagar_id',
  as: 'pagamentos'
});

ContaPagarPagamento.belongsTo(ContaPagar, {
  foreignKey: 'conta_pagar_id',
  as: 'contaPagar'
});

ContaPagarPagamento.belongsTo(Usuario, {
  foreignKey: 'usuario_id',
  as: 'usuario'
});

// Exportar todos os modelos
export {
  Cliente,
  Plano,
  Banco,
  Titulo,
  Contrato,
  ContratoPlanoAdicional,
  DadosEmpresa,
  ScheduledRoutine,
  RoutineExecutionLog,
  ServidorEmail,
  ServidorWhatsApp,
  ModeloDocumento,
  DiasVencimento,
  TermoContrato,
  ModeloTermo,
  Usuario,
  Auditoria,
  AssinaturaDigital,
  ClienteArquivo,
  AssinaturaDigitalProvider,
  Fornecedor,
  FornecedorContato,
  FornecedorArquivo,
  FornecedorHistorico,
  ContaPagar,
  ContaPagarArquivo,
  ContaPagarPagamento
};
