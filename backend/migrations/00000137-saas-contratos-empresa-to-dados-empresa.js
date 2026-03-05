'use strict';

/**
 * Corrige FK de saas_contratos.empresa_id: saas_dados_empresa -> dados_empresa
 * Os Clientes Tenants usam dados_empresa; contratos devem referenciar a mesma tabela.
 */
module.exports = {
  async up(queryInterface) {
    // Remove órfãos (empresa_id que não existe em dados_empresa)
    await queryInterface.sequelize.query(`
      DELETE FROM saas_contratos WHERE empresa_id NOT IN (SELECT id FROM dados_empresa);
    `).catch(() => {});

    const [results] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saas_contratos'
      AND COLUMN_NAME = 'empresa_id' AND REFERENCED_TABLE_NAME IS NOT NULL;
    `);
    const fkName = results?.[0]?.CONSTRAINT_NAME ?? results?.[0]?.constraint_name;
    if (fkName) {
      await queryInterface.sequelize.query(`ALTER TABLE saas_contratos DROP FOREIGN KEY \`${fkName}\`;`);
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE saas_contratos
      ADD CONSTRAINT saas_contratos_empresa_fk
      FOREIGN KEY (empresa_id) REFERENCES dados_empresa(id) ON UPDATE CASCADE ON DELETE CASCADE;
    `);
  },

  async down(queryInterface) {
    const [results] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saas_contratos'
      AND COLUMN_NAME = 'empresa_id' AND REFERENCED_TABLE_NAME IS NOT NULL;
    `);
    const fkName = results && results[0] ? results[0].CONSTRAINT_NAME : null;
    if (fkName) {
      await queryInterface.sequelize.query(`ALTER TABLE saas_contratos DROP FOREIGN KEY \`${fkName}\`;`);
    }
    await queryInterface.sequelize.query(`
      ALTER TABLE saas_contratos
      ADD CONSTRAINT saas_contratos_empresa_fk
      FOREIGN KEY (empresa_id) REFERENCES saas_dados_empresa(id) ON UPDATE CASCADE ON DELETE CASCADE;
    `);
  },
};
