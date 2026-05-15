'use strict';

/**
 * Renomeia adm_sistema_dados_empresa → adm_sistema_tenants (cadastro de clientes/tenants).
 * saas_saas_dados_empresa permanece como dados da empresa operadora do SaaS.
 */

const OLD_TABLE = 'adm_sistema_dados_empresa';
const NEW_TABLE = 'adm_sistema_tenants';

async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    { replacements: [tableName] }
  );
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  async up(queryInterface) {
    const oldExists = await tableExists(queryInterface, OLD_TABLE);
    const newExists = await tableExists(queryInterface, NEW_TABLE);
    if (oldExists && !newExists) {
      await queryInterface.renameTable(OLD_TABLE, NEW_TABLE);
    }
  },

  async down(queryInterface) {
    const oldExists = await tableExists(queryInterface, NEW_TABLE);
    const newExists = await tableExists(queryInterface, OLD_TABLE);
    if (oldExists && !newExists) {
      await queryInterface.renameTable(NEW_TABLE, OLD_TABLE);
    }
  },
};
