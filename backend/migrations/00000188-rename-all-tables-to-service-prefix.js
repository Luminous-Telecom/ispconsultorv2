'use strict';

/**
 * Padroniza tabelas ADM e SAAS para o formato <prefixo>_<servico>_<entidade>.
 */

const RENAMES = [
  ['adm_agents', 'adm_agent_agents'],
  ['adm_assinaturas_digital', 'adm_assinatura_digital_assinaturas_digital'],
  ['adm_bancos', 'adm_cadastros_bancos'],
  ['adm_cliente_arquivos', 'adm_clientes_cliente_arquivos'],
  ['adm_clientes', 'adm_clientes_clientes'],
  ['adm_conta_pagar_pagamentos', 'adm_financeiro_conta_pagar_pagamentos'],
  ['adm_contas_pagar', 'adm_financeiro_contas_pagar'],
  ['adm_contrato_planos_adicionais', 'adm_contratos_contrato_planos_adicionais'],
  ['adm_contratos', 'adm_contratos_contratos'],
  ['adm_dados_empresa', 'adm_sistema_dados_empresa'],
  ['adm_dias_vencimento', 'adm_cadastros_dias_vencimento'],
  ['adm_fornecedores', 'adm_financeiro_fornecedores'],
  ['adm_mensagens_email', 'adm_comunicacao_mensagens_email'],
  ['adm_mensagens_historico', 'adm_comunicacao_mensagens_historico'],
  ['adm_mensagens_whatsapp', 'adm_comunicacao_mensagens_whatsapp'],
  ['adm_modelo_documento', 'adm_documentos_modelo_documento'],
  ['adm_notas_fiscais', 'adm_nfse_notas_fiscais'],
  ['adm_parametros', 'adm_sistema_parametros'],
  ['adm_planos', 'adm_cadastros_planos'],
  ['adm_scheduled_routines', 'adm_sistema_scheduled_routines'],
  ['adm_servidores_email', 'adm_comunicacao_servidores_email'],
  ['adm_servidores_whatsapp', 'adm_comunicacao_servidores_whatsapp'],
  ['adm_ssh_device_backup_events', 'adm_ssh_manager_ssh_device_backup_events'],
  ['adm_ssh_device_backups', 'adm_ssh_manager_ssh_device_backups'],
  ['adm_ssh_devices', 'adm_ssh_manager_ssh_devices'],
  ['adm_templates_whatsapp', 'adm_comunicacao_templates_whatsapp'],
  ['adm_termos_contrato', 'adm_contratos_termos_contrato'],
  ['adm_tipos_cobranca_contrato', 'adm_cadastros_tipos_cobranca_contrato'],
  ['adm_titulos', 'adm_financeiro_titulos'],
  ['adm_usuarios', 'adm_cadastros_usuarios'],
  ['saas_bancos', 'saas_saas_bancos'],
  ['saas_contratos', 'saas_saas_contratos'],
  ['saas_dados_empresa', 'saas_saas_dados_empresa'],
  ['saas_dias_vencimento', 'saas_saas_dias_vencimento'],
  ['saas_mensagens_historico', 'saas_saas_mensagens_historico'],
  ['saas_nfse_config', 'saas_saas_nfse_config'],
  ['saas_parametros', 'saas_saas_parametros'],
  ['saas_planos', 'saas_saas_planos'],
  ['saas_scheduled_routines', 'saas_saas_scheduled_routines'],
  ['saas_servidores_email', 'saas_saas_servidores_email'],
  ['saas_servidores_whatsapp', 'saas_saas_servidores_whatsapp'],
  ['saas_tipos_cobranca', 'saas_saas_tipos_cobranca'],
  ['saas_titulos', 'saas_saas_titulos'],
  ['saas_usuarios_super', 'saas_saas_usuarios_super'],
];

async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    { replacements: [tableName] }
  );
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  async up(queryInterface) {
    for (const [oldName, newName] of RENAMES) {
      const oldExists = await tableExists(queryInterface, oldName);
      const newExists = await tableExists(queryInterface, newName);
      if (oldExists && !newExists) {
        await queryInterface.renameTable(oldName, newName);
      }
    }
  },

  async down(queryInterface) {
    const reverse = [...RENAMES].reverse().map(([oldName, newName]) => [newName, oldName]);
    for (const [oldName, newName] of reverse) {
      const oldExists = await tableExists(queryInterface, oldName);
      const newExists = await tableExists(queryInterface, newName);
      if (oldExists && !newExists) {
        await queryInterface.renameTable(oldName, newName);
      }
    }
  },
};
