'use strict';

/**
 * Renomeia todas as tabelas do Admin (ERP) para o padrão adm_*,
 * alinhado ao SaaS que usa saas_*.
 */

const RENAMES = [
  ['assinaturas_digital', 'adm_assinaturas_digital'],
  ['assinatura_digital_providers', 'adm_assinatura_digital_providers'],
  ['auditoria', 'adm_auditoria'],
  ['blockdomi_log_acesso', 'adm_blockdomi_log_acesso'],
  ['bancos', 'adm_bancos'],
  ['clientes', 'adm_clientes'],
  ['cliente_arquivos', 'adm_cliente_arquivos'],
  ['contratos', 'adm_contratos'],
  ['contrato_planos_adicionais', 'adm_contrato_planos_adicionais'],
  ['conta_pagar_arquivos', 'adm_conta_pagar_arquivos'],
  ['conta_pagar_pagamentos', 'adm_conta_pagar_pagamentos'],
  ['contas_pagar', 'adm_contas_pagar'],
  ['dados_empresa', 'adm_dados_empresa'],
  ['dias_vencimento', 'adm_dias_vencimento'],
  ['dominios', 'adm_dominios'],
  ['fornecedor_arquivos', 'adm_fornecedor_arquivos'],
  ['fornecedor_contatos', 'adm_fornecedor_contatos'],
  ['fornecedor_historicos', 'adm_fornecedor_historicos'],
  ['fornecedores', 'adm_fornecedores'],
  ['ips_permitidos_blockdomi', 'adm_ips_permitidos_blockdomi'],
  ['ipv4', 'adm_ipv4'],
  ['ipv6', 'adm_ipv6'],
  ['mensagens_email', 'adm_mensagens_email'],
  ['mensagens_historico', 'adm_mensagens_historico'],
  ['mensagens_whatsapp', 'adm_mensagens_whatsapp'],
  ['modelo_documento', 'adm_modelo_documento'],
  ['nfse_config', 'adm_nfse_config'],
  ['notas_fiscais', 'adm_notas_fiscais'],
  ['parametros', 'adm_parametros'],
  ['planos', 'adm_planos'],
  ['routine_execution_logs', 'adm_routine_execution_logs'],
  ['scheduled_routines', 'adm_scheduled_routines'],
  ['servidores_email', 'adm_servidores_email'],
  ['servidores_whatsapp', 'adm_servidores_whatsapp'],
  ['termos_contrato', 'adm_termos_contrato'],
  ['templates_whatsapp', 'adm_templates_whatsapp'],
  ['tipos_cobranca_contrato', 'adm_tipos_cobranca_contrato'],
  ['titulos', 'adm_titulos'],
  ['usuarios', 'adm_usuarios'],
  ['versoes_blockdomi', 'adm_versoes_blockdomi'],
  ['operacoes_blockdomi', 'adm_operacoes_blockdomi'],
];

async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
    { replacements: [tableName] }
  );
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  async up(queryInterface) {
    for (const [oldName, newName] of RENAMES) {
      const exists = await tableExists(queryInterface, oldName);
      if (exists) {
        await queryInterface.renameTable(oldName, newName);
      }
    }
  },

  async down(queryInterface) {
    const reverse = RENAMES.map(([old, novo]) => [novo, old]);
    for (const [oldName, newName] of reverse) {
      const exists = await tableExists(queryInterface, oldName);
      if (exists) {
        await queryInterface.renameTable(oldName, newName);
      }
    }
  },
};
