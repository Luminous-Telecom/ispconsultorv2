'use strict';

/**
 * Início e fim reais da execução do backup (gravados ao registrar o arquivo).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('adm_ssh_device_backups', 'started_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('adm_ssh_device_backups', 'finished_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE adm_ssh_device_backups
      SET started_at = created_at, finished_at = created_at
      WHERE started_at IS NULL OR finished_at IS NULL
    `);

    await queryInterface.changeColumn('adm_ssh_device_backups', 'started_at', {
      type: Sequelize.DATE,
      allowNull: false,
    });
    await queryInterface.changeColumn('adm_ssh_device_backups', 'finished_at', {
      type: Sequelize.DATE,
      allowNull: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('adm_ssh_device_backups', 'finished_at');
    await queryInterface.removeColumn('adm_ssh_device_backups', 'started_at');
  },
};
