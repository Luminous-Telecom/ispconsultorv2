'use strict';

/** Remove coluna `status` de `saas_saas_scheduled_routines` (uso apenas `ativo`). */

const TABLE = 'saas_saas_scheduled_routines';

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn(TABLE, 'status');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn(TABLE, 'status', {
      type: Sequelize.CHAR(1),
      allowNull: false,
      defaultValue: 'A'
    });
    await queryInterface.sequelize.query(
      `UPDATE \`${TABLE}\` SET status = CASE WHEN ativo = 1 OR ativo = TRUE THEN 'A' ELSE 'I' END`
    );
  }
};
