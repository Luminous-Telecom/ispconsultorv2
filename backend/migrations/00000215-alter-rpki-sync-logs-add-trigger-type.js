'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('rpki_sync_logs', 'trigger_type', {
      type: Sequelize.ENUM('roa', 'aspa', 'manual'),
      allowNull: true,
      defaultValue: null,
      after: 'type',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('rpki_sync_logs', 'trigger_type');
  },
};
