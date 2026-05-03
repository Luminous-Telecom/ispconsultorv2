'use strict';

/**
 * Remove tabelas órfãs de log (não referenciadas no código atual).
 * Remove direto, sem criação de tabelas de backup.
 */

const ORPHAN_TABLES = [
  'adm_log_aplicacao',
  'adm_log_auditoria',
  'adm_log_blockdomi',
  'adm_log_mensagem_envio',
  'adm_log_operacao',
  'adm_log_rotina_execucao',
  'adm_ssh_audit_log',
  'saas_log_acesso',
  'saas_log_auditoria',
  'saas_log_operacao',
  'saas_log_rotina_execucao',
];

const TABLE_NAME_REGEX = /^[a-z0-9_]+$/;

function assertSafeTableName(tableName) {
  if (!TABLE_NAME_REGEX.test(tableName)) {
    throw new Error(`Nome de tabela inválido: ${tableName}`);
  }
}

async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    { replacements: [tableName] }
  );
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  async up(queryInterface) {
    for (const tableName of ORPHAN_TABLES) {
      assertSafeTableName(tableName);
      const tableNameExists = await tableExists(queryInterface, tableName);

      if (tableNameExists) {
        await queryInterface.dropTable(tableName);
      }
    }
  },

  async down() {
    // Migração destrutiva sem restauração automática.
  },
};
