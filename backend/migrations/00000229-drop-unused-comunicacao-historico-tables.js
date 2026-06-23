'use strict';

/**
 * Remove tabelas legadas de histórico de mensagens SaaS (substituídas por adm_comunicacao_mensagens_historico).
 */

const TABELAS_REMOVER = [
  'saas_saas_mensagens_historico',
  'saas_mensagens_historico',
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
    for (const tableName of TABELAS_REMOVER) {
      if (await tableExists(queryInterface, tableName)) {
        await queryInterface.dropTable(tableName);
      }
    }
  },

  async down() {
    // Destrutiva — dados já estão em adm_comunicacao_mensagens_historico.
  },
};
