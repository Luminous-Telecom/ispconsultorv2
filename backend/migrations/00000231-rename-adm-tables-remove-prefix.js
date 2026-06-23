'use strict';

/**
 * Remove prefixo adm_ e simplifica nomes redundantes das tabelas ERP.
 * Ex.: adm_clientes_clientes → clientes, adm_ssh_manager_ssh_devices → ssh_manager_devices
 */

const RENAMES = [
  ['adm_assinatura_digital_assinaturas_digital', 'assinatura_digital_assinaturas'],
  ['adm_contratos_contrato_planos_adicionais', 'contratos_planos_adicionais'],
  ['adm_ssh_manager_ssh_device_backup_events', 'ssh_manager_device_backup_events'],
  ['adm_cadastros_tipos_cobranca_contrato', 'cadastros_tipos_cobranca_contrato'],
  ['adm_financeiro_conta_pagar_pagamentos', 'financeiro_conta_pagar_pagamentos'],
  ['adm_clientes_cliente_arquivos', 'clientes_arquivos'],
  ['adm_comunicacao_mensagens_historico', 'comunicacao_mensagens_historico'],
  ['adm_ssh_manager_ssh_device_backups', 'ssh_manager_device_backups'],
  ['adm_comunicacao_mensagens_whatsapp', 'comunicacao_mensagens_whatsapp'],
  ['adm_comunicacao_servidores_whatsapp', 'comunicacao_servidores_whatsapp'],
  ['adm_comunicacao_templates_whatsapp', 'comunicacao_templates_whatsapp'],
  ['adm_contratos_integracao_ixc_vinculos', 'contratos_integracao_ixc_vinculos'],
  ['adm_assinatura_digital_providers', 'assinatura_digital_providers'],
  ['adm_blockdomi_numeros_sei_anatel', 'blockdomi_numeros_sei_anatel'],
  ['adm_comunicacao_mensagens_email', 'comunicacao_mensagens_email'],
  ['adm_comunicacao_servidores_email', 'comunicacao_servidores_email'],
  ['adm_sistema_logs_operacionais', 'sistema_logs_operacionais'],
  ['adm_cadastros_dias_vencimento', 'cadastros_dias_vencimento'],
  ['adm_sistema_scheduled_routines', 'sistema_scheduled_routines'],
  ['adm_contratos_termos_contrato', 'contratos_termos'],
  ['adm_documentos_modelo_documento', 'documentos_modelo'],
  ['adm_financeiro_contas_pagar', 'financeiro_contas_pagar'],
  ['adm_ssh_manager_ssh_devices', 'ssh_manager_devices'],
  ['adm_blockdomi_ips_permitidos', 'blockdomi_ips_permitidos'],
  ['adm_operacoes_blockdomi', 'blockdomi_operacoes'],
  ['adm_cadastros_usuarios', 'cadastros_usuarios'],
  ['adm_contratos_contratos', 'contratos'],
  ['adm_financeiro_fornecedores', 'financeiro_fornecedores'],
  ['adm_financeiro_titulos', 'financeiro_titulos'],
  ['adm_integracao_ixc_provedor', 'integracao_ixc_provedor'],
  ['adm_blockdomi_dominios', 'blockdomi_dominios'],
  ['adm_cadastros_bancos', 'cadastros_bancos'],
  ['adm_cadastros_planos', 'cadastros_planos'],
  ['adm_clientes_clientes', 'clientes'],
  ['adm_agent_agents', 'agent_agents'],
  ['adm_blockdomi_versoes', 'blockdomi_versoes'],
  ['adm_sistema_parametros', 'sistema_parametros'],
  ['adm_sistema_tenants', 'sistema_tenants'],
  ['adm_blockdomi_ipv4', 'blockdomi_ipv4'],
  ['adm_blockdomi_ipv6', 'blockdomi_ipv6'],
  ['adm_nfse_notas_fiscais', 'nfse_notas_fiscais'],
  ['adm_nfse_config', 'nfse_config'],
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
    const reverse = [...RENAMES].reverse();
    for (const [oldName, newName] of reverse) {
      const oldExists = await tableExists(queryInterface, newName);
      const newExists = await tableExists(queryInterface, oldName);
      if (oldExists && !newExists) {
        await queryInterface.renameTable(newName, oldName);
      }
    }
  },
};
