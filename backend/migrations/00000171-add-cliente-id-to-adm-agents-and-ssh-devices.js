'use strict';

/**
 * Vincula agentes (túnel) e devices SSH a um cliente do ERP.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('adm_agents', 'cliente_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'adm_clientes', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('adm_agents', ['cliente_id']);

    await queryInterface.addColumn('adm_ssh_devices', 'cliente_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'adm_clientes', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('adm_ssh_devices', ['cliente_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('adm_ssh_devices', ['cliente_id']);
    await queryInterface.removeColumn('adm_ssh_devices', 'cliente_id');
    await queryInterface.removeIndex('adm_agents', ['cliente_id']);
    await queryInterface.removeColumn('adm_agents', 'cliente_id');
  },
};
