'use strict';

/**
 * Remove prefixo duplicado das tabelas SaaS: saas_saas_* → saas_*.
 */

const RENAMES = [
  ['saas_saas_bancos', 'saas_bancos'],
  ['saas_saas_contratos', 'saas_contratos'],
  ['saas_saas_dados_empresa', 'saas_dados_empresa'],
  ['saas_saas_dias_vencimento', 'saas_dias_vencimento'],
  ['saas_saas_nfse_config', 'saas_nfse_config'],
  ['saas_saas_parametros', 'saas_parametros'],
  ['saas_saas_planos', 'saas_planos'],
  ['saas_saas_scheduled_routines', 'saas_scheduled_routines'],
  ['saas_saas_servidores_email', 'saas_servidores_email'],
  ['saas_saas_servidores_whatsapp', 'saas_servidores_whatsapp'],
  ['saas_saas_tipos_cobranca', 'saas_tipos_cobranca'],
  ['saas_saas_titulos', 'saas_titulos'],
  ['saas_saas_usuarios_super', 'saas_usuarios_super'],
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
