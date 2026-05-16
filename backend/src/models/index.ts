// Importar todos os modelos
// Assinatura Digital
import { AssinaturaDigital } from './assinatura-digital/AssinaturaDigital';
import AssinaturaDigitalProvider from './assinatura-digital/AssinaturaDigitalProvider';

// Clientes
import { Cliente } from './clientes/Cliente';
import { ClienteArquivo } from './clientes/ClienteArquivo';

// Contratos
import { Contrato } from './contratos/Contrato';
import { ContratoPlanoAdicional } from './contratos/ContratoPlanoAdicional';
import { TermoContrato } from './contratos/TermoContrato';

// Documentos
import { ModeloDocumento } from './documentos/ModeloDocumento';

// Financeiro
import { Titulo } from './financeiro/Titulo';
import { Fornecedor } from './financeiro/Fornecedor';
import { ContaPagar } from './financeiro/ContaPagar';
import { ContaPagarPagamento } from './financeiro/ContaPagarPagamento';

// NFS-e
import { NotaFiscal } from './nfse/NotaFiscal';
import { NFSeConfig } from './nfse/NFSeConfig';

// Cadastros
import { Plano } from './cadastros/Plano';
import { Banco } from './cadastros/Banco';
import { Usuario } from './cadastros/Usuario';
import { DiasVencimento } from './cadastros/DiasVencimento';
import { TipoCobrancaContrato } from './cadastros/TipoCobrancaContrato';

// Sistema
import { DadosEmpresa } from './sistema/DadosEmpresa';
import { ScheduledRoutine } from './sistema/ScheduledRoutine';
import Parametros from './sistema/Parametros';
import { SistemaLogOperacional } from './sistema/SistemaLogOperacional';

// Comunicação
import { ServidorEmail } from './comunicacao/ServidorEmail';
import { ServidorWhatsApp } from './comunicacao/ServidorWhatsApp';
import { MensagemHistorico } from './comunicacao/MensagemHistorico';
import { MensagemWhatsApp } from './comunicacao/MensagemWhatsApp';
import { TemplateWhatsApp } from './comunicacao/TemplateWhatsApp';

// Blockdomi
import { Dominio } from './blockdomi/Dominio';
import { IPv4 } from './blockdomi/IPv4';
import { IPv6 } from './blockdomi/IPv6';
import { VersaoBlockdomi } from './blockdomi/VersaoBlockdomi';
import { NumeroSeiAnatelBlockdomi } from './blockdomi/NumeroSeiAnatelBlockdomi';
import { IpPermitidoBlockdomi } from './blockdomi/IpPermitidoBlockdomi';
import { BlockdomiLogAcesso } from './blockdomi/BlockdomiLogAcesso';

// SSH Manager
import { SshDevice } from './ssh-manager/SshDevice';
import { SshDeviceBackup } from './ssh-manager/SshDeviceBackup';
import { SshDeviceBackupEvent } from './ssh-manager/SshDeviceBackupEvent';

// Agent
import { Agent } from './agent/Agent';
import {
  RpkiRoa,
  RpkiValidationLog,
  RpkiAlert,
  RpkiSyncSession,
  RpkiCa,
  RpkiCaParent,
  RpkiRepository,
  RpkiCaResource,
  RpkiAspa,
} from './rpki';

// SaaS
import { SaasPlano } from './saas/SaasPlano';
import { SaasDadosEmpresa } from './saas/SaasDadosEmpresa';
import { SaasContrato } from './saas/SaasContrato';
import { SaasUsuarioSuper } from './saas/SaasUsuarioSuper';
import { SaasServidorEmail } from './saas/SaasServidorEmail';
import { SaasServidorWhatsapp } from './saas/SaasServidorWhatsapp';
import { SaasBanco } from './saas/SaasBanco';
import { SaasTipoCobranca } from './saas/SaasTipoCobranca';
import { SaasDiasVencimento } from './saas/SaasDiasVencimento';
import { SaasTitulo } from './saas/SaasTitulo';
import SaasParametros from './saas/SaasParametros';
import { SaasScheduledRoutine } from './saas/SaasScheduledRoutine';
import { SaasNFSeConfig } from './saas/SaasNFSeConfig';
import { SaasMensagemHistorico } from './saas/SaasMensagemHistorico';

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

Cliente.hasMany(NotaFiscal, {
  foreignKey: 'cliente_id',
  as: 'notasFiscais'
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

Titulo.belongsTo(Contrato, {
  foreignKey: 'contrato_id',
  as: 'contrato'
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

Contrato.belongsTo(TipoCobrancaContrato, {
  foreignKey: 'tipo_cobranca_contrato_id',
  as: 'tipoCobrancaContrato'
});

TipoCobrancaContrato.hasMany(Contrato, {
  foreignKey: 'tipo_cobranca_contrato_id',
  as: 'contratos'
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

DadosEmpresa.hasMany(ModeloDocumento, { foreignKey: 'empresa_id', as: 'modelosDocumento' });
ModeloDocumento.belongsTo(DadosEmpresa, { foreignKey: 'empresa_id', as: 'empresa' });

// Blockdomi - VersaoBlockdomi
VersaoBlockdomi.hasMany(Dominio, { foreignKey: 'versao_id' });
Dominio.belongsTo(VersaoBlockdomi, { foreignKey: 'versao_id', as: 'versaoRef' });
VersaoBlockdomi.hasMany(IPv4, { foreignKey: 'versao_id' });
IPv4.belongsTo(VersaoBlockdomi, { foreignKey: 'versao_id', as: 'versaoRef' });
VersaoBlockdomi.hasMany(IPv6, { foreignKey: 'versao_id' });
IPv6.belongsTo(VersaoBlockdomi, { foreignKey: 'versao_id', as: 'versaoRef' });

// Blockdomi — Nº SEI Anatel (tabela única, FK como versao_id)
NumeroSeiAnatelBlockdomi.hasMany(Dominio, { foreignKey: 'numero_sei_anatel_id' });
Dominio.belongsTo(NumeroSeiAnatelBlockdomi, { foreignKey: 'numero_sei_anatel_id', as: 'numeroSeiRef' });
NumeroSeiAnatelBlockdomi.hasMany(IPv4, { foreignKey: 'numero_sei_anatel_id' });
IPv4.belongsTo(NumeroSeiAnatelBlockdomi, { foreignKey: 'numero_sei_anatel_id', as: 'numeroSeiRef' });
NumeroSeiAnatelBlockdomi.hasMany(IPv6, { foreignKey: 'numero_sei_anatel_id' });
IPv6.belongsTo(NumeroSeiAnatelBlockdomi, { foreignKey: 'numero_sei_anatel_id', as: 'numeroSeiRef' });

// IpPermitidoBlockdomi
Cliente.hasOne(IpPermitidoBlockdomi, { foreignKey: 'cliente_id', as: 'ipPermitido' });
IpPermitidoBlockdomi.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

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

// Fornecedor / ContaPagar
Fornecedor.hasMany(ContaPagar, {
  foreignKey: 'fornecedor_id',
  as: 'contasPagar'
});

ContaPagar.belongsTo(Fornecedor, {
  foreignKey: 'fornecedor_id',
  as: 'fornecedor'
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

// MensagemHistorico
MensagemHistorico.belongsTo(Usuario, {
  foreignKey: 'usuario_id',
  as: 'usuario'
});

SistemaLogOperacional.belongsTo(DadosEmpresa, { foreignKey: 'empresa_id', as: 'empresa' });
SistemaLogOperacional.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// SaaS — tenants em adm_sistema_tenants; saas_saas_dados_empresa = empresa operadora do SaaS
DadosEmpresa.hasMany(SaasContrato, { foreignKey: 'empresa_id', as: 'saasContratos' });
SaasContrato.belongsTo(DadosEmpresa, { foreignKey: 'empresa_id', as: 'empresa' });
SaasPlano.hasMany(SaasContrato, { foreignKey: 'plano_id', as: 'contratos' });
SaasContrato.belongsTo(SaasPlano, { foreignKey: 'plano_id', as: 'plano' });

DadosEmpresa.hasMany(SaasMensagemHistorico, { foreignKey: 'empresa_id', as: 'mensagensHistorico' });
SaasMensagemHistorico.belongsTo(DadosEmpresa, { foreignKey: 'empresa_id', as: 'empresa' });

DadosEmpresa.hasMany(SaasTitulo, { foreignKey: 'empresa_id', as: 'titulos' });
SaasTitulo.belongsTo(DadosEmpresa, { foreignKey: 'empresa_id', as: 'empresa' });

SaasPlano.hasMany(SaasDadosEmpresa, { foreignKey: 'plano_id', as: 'empresas' });
SaasDadosEmpresa.belongsTo(SaasPlano, { foreignKey: 'plano_id', as: 'plano' });

SaasPlano.hasMany(SaasTitulo, { foreignKey: 'plano_id', as: 'titulos' });
SaasTitulo.belongsTo(SaasPlano, { foreignKey: 'plano_id', as: 'plano' });

SaasBanco.hasMany(SaasTitulo, { foreignKey: 'banco_id', as: 'titulos' });
SaasTitulo.belongsTo(SaasBanco, { foreignKey: 'banco_id', as: 'banco' });

SaasContrato.hasMany(SaasTitulo, { foreignKey: 'contrato_id', as: 'titulos' });
SaasTitulo.belongsTo(SaasContrato, { foreignKey: 'contrato_id', as: 'contrato' });

SaasBanco.hasMany(SaasContrato, { foreignKey: 'banco_id', as: 'contratos' });
SaasContrato.belongsTo(SaasBanco, { foreignKey: 'banco_id', as: 'banco' });

// TemplateWhatsApp e MensagemWhatsApp
TemplateWhatsApp.hasMany(MensagemWhatsApp, {
  foreignKey: 'template_id',
  as: 'mensagens'
});
MensagemWhatsApp.belongsTo(TemplateWhatsApp, {
  foreignKey: 'template_id',
  as: 'template'
});

// NotaFiscal
NotaFiscal.belongsTo(Cliente, {
  foreignKey: 'cliente_id',
  as: 'cliente'
});

NotaFiscal.belongsTo(Titulo, {
  foreignKey: 'titulo_id',
  as: 'titulo'
});

Titulo.hasMany(NotaFiscal, {
  foreignKey: 'titulo_id',
  as: 'notas_fiscais'
});

Titulo.belongsTo(NotaFiscal, {
  foreignKey: 'nota_fiscal_id',
  as: 'nota_fiscal'
});

// Agent — pertence a DadosEmpresa (multi-tenant)
Agent.belongsTo(DadosEmpresa, {
  foreignKey: 'empresa_id',
  as: 'empresa',
});

DadosEmpresa.hasMany(Agent, {
  foreignKey: 'empresa_id',
  as: 'agents',
});

// SSH Manager — SshDevice pertence a Agent (opcional) e DadosEmpresa (multi-tenant)
SshDevice.belongsTo(DadosEmpresa, {
  foreignKey: 'empresa_id',
  as: 'empresa',
});

DadosEmpresa.hasMany(SshDevice, {
  foreignKey: 'empresa_id',
  as: 'ssh_devices',
});

SshDevice.belongsTo(Agent, {
  foreignKey: 'agent_id',
  as: 'agent',
});

Agent.hasMany(SshDevice, {
  foreignKey: 'agent_id',
  as: 'ssh_devices',
});

Cliente.hasMany(Agent, {
  foreignKey: 'cliente_id',
  as: 'agents',
});

Agent.belongsTo(Cliente, {
  foreignKey: 'cliente_id',
  as: 'cliente',
});

Cliente.hasMany(SshDevice, {
  foreignKey: 'cliente_id',
  as: 'ssh_devices',
});

SshDevice.belongsTo(Cliente, {
  foreignKey: 'cliente_id',
  as: 'cliente',
});

SshDevice.hasMany(SshDeviceBackup, {
  foreignKey: 'ssh_device_id',
  as: 'ssh_device_backups',
});

SshDeviceBackup.belongsTo(SshDevice, {
  foreignKey: 'ssh_device_id',
  as: 'ssh_device',
});

SshDevice.hasMany(SshDeviceBackupEvent, {
  foreignKey: 'ssh_device_id',
  as: 'ssh_device_backup_events',
});

SshDeviceBackupEvent.belongsTo(SshDevice, {
  foreignKey: 'ssh_device_id',
  as: 'ssh_device',
});

// Exportar todos os modelos
export {
  Cliente,
  Plano,
  Banco,
  TipoCobrancaContrato,
  Titulo,
  Contrato,
  ContratoPlanoAdicional,
  DadosEmpresa,
  ScheduledRoutine,
  ServidorEmail,
  ServidorWhatsApp,
  ModeloDocumento,
  DiasVencimento,
  TermoContrato,
  Usuario,
  AssinaturaDigital,
  ClienteArquivo,
  AssinaturaDigitalProvider,
  Parametros,
  SistemaLogOperacional,
  Fornecedor,
  ContaPagar,
  ContaPagarPagamento,
  NotaFiscal,
  NFSeConfig,
  Dominio,
  IPv4,
  IPv6,
  VersaoBlockdomi,
  NumeroSeiAnatelBlockdomi,
  IpPermitidoBlockdomi,
  MensagemWhatsApp,
  TemplateWhatsApp,
  SaasPlano,
  SaasDadosEmpresa,
  SaasContrato,
  SaasUsuarioSuper,
  SaasServidorEmail,
  SaasServidorWhatsapp,
  SaasBanco,
  SaasTipoCobranca,
  SaasDiasVencimento,
  SaasTitulo,
  SaasParametros,
  SaasScheduledRoutine,
  SaasNFSeConfig,
  SaasMensagemHistorico,
  SshDevice,
  SshDeviceBackup,
  SshDeviceBackupEvent,
  Agent,
  RpkiRoa,
  RpkiValidationLog,
  RpkiAlert,
  RpkiSyncSession,
  RpkiCa,
  RpkiCaParent,
  RpkiRepository,
  RpkiCaResource,
  RpkiAspa,
};
