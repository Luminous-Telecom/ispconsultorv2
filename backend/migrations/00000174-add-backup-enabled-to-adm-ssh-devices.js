'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('adm_ssh_devices', 'backup_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Incluir equipamento em rotinas de backup automático',
    });
    await queryInterface.addIndex('adm_ssh_devices', ['backup_enabled']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('adm_ssh_devices', ['backup_enabled']);
    await queryInterface.removeColumn('adm_ssh_devices', 'backup_enabled');
  },
};
