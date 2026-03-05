'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('saas_contratos', 'banco_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'saas_bancos', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('saas_contratos', ['banco_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('saas_contratos', 'banco_id');
  },
};
