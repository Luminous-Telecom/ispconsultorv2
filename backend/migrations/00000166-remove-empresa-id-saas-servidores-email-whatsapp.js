'use strict';

/**
 * Remove empresa_id de saas_servidores_email e saas_servidores_whatsapp.
 * Servidores SaaS são globais/exclusivos do módulo SaaS.
 */
module.exports = {
  async up(queryInterface) {
    for (const table of ['saas_servidores_email', 'saas_servidores_whatsapp']) {
      const [results] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}'
        AND COLUMN_NAME = 'empresa_id' AND REFERENCED_TABLE_NAME IS NOT NULL;
      `);
      const fkName = results?.[0]?.CONSTRAINT_NAME ?? results?.[0]?.constraint_name;
      if (fkName) {
        await queryInterface.sequelize.query(`ALTER TABLE ${table} DROP FOREIGN KEY \`${fkName}\`;`);
      }
      await queryInterface.removeIndex(table, ['empresa_id']).catch(() => {});
      await queryInterface.removeColumn(table, 'empresa_id');
    }
  },

  async down(queryInterface, Sequelize) {
    for (const table of ['saas_servidores_email', 'saas_servidores_whatsapp']) {
      await queryInterface.addColumn(table, 'empresa_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'saas_dados_empresa', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
      const [firstEmpresa] = await queryInterface.sequelize.query(
        "SELECT id FROM saas_dados_empresa ORDER BY id ASC LIMIT 1"
      );
      const defaultId = firstEmpresa?.[0]?.id ?? 1;
      await queryInterface.sequelize.query(
        `UPDATE ${table} SET empresa_id = ${defaultId} WHERE empresa_id IS NULL`
      );
      await queryInterface.changeColumn(table, 'empresa_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
      });
      await queryInterface.addIndex(table, ['empresa_id']);
    }
  }
};
