'use strict';

/**
 * Remove empresa_id de saas_bancos. Bancos SaaS sao globais/compartilhados entre tenants.
 */
module.exports = {
  async up(queryInterface) {
    const [results] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saas_bancos'
      AND COLUMN_NAME = 'empresa_id' AND REFERENCED_TABLE_NAME IS NOT NULL;
    `);
    const fkName = results?.[0]?.CONSTRAINT_NAME ?? results?.[0]?.constraint_name;
    if (fkName) {
      await queryInterface.sequelize.query(`ALTER TABLE saas_bancos DROP FOREIGN KEY \`${fkName}\`;`);
    }
    await queryInterface.removeIndex('saas_bancos', ['empresa_id']).catch(() => {});
    await queryInterface.removeColumn('saas_bancos', 'empresa_id');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('saas_bancos', 'empresa_id', {
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
      `UPDATE saas_bancos SET empresa_id = ${defaultId} WHERE empresa_id IS NULL`
    );
    await queryInterface.changeColumn('saas_bancos', 'empresa_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.addIndex('saas_bancos', ['empresa_id']);
  }
};
