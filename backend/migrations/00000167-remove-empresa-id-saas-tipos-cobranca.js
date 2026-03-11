'use strict';

/**
 * Remove empresa_id de saas_tipos_cobranca. Tipos de cobrança SaaS são globais/exclusivos do módulo SaaS.
 */
module.exports = {
  async up(queryInterface) {
    const [results] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saas_tipos_cobranca'
      AND COLUMN_NAME = 'empresa_id' AND REFERENCED_TABLE_NAME IS NOT NULL;
    `);
    const fkName = results?.[0]?.CONSTRAINT_NAME ?? results?.[0]?.constraint_name;
    if (fkName) {
      await queryInterface.sequelize.query(`ALTER TABLE saas_tipos_cobranca DROP FOREIGN KEY \`${fkName}\`;`);
    }
    await queryInterface.removeIndex('saas_tipos_cobranca', ['empresa_id']).catch(() => {});
    await queryInterface.removeColumn('saas_tipos_cobranca', 'empresa_id');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('saas_tipos_cobranca', 'empresa_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'dados_empresa', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    const [firstEmpresa] = await queryInterface.sequelize.query(
      "SELECT id FROM dados_empresa ORDER BY id ASC LIMIT 1"
    );
    const defaultId = firstEmpresa?.[0]?.id ?? 1;
    await queryInterface.sequelize.query(
      `UPDATE saas_tipos_cobranca SET empresa_id = ${defaultId} WHERE empresa_id IS NULL`
    );
    await queryInterface.changeColumn('saas_tipos_cobranca', 'empresa_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.addIndex('saas_tipos_cobranca', ['empresa_id']);
  }
};
