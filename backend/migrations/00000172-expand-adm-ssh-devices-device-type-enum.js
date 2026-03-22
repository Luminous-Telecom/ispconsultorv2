'use strict';

/**
 * Normaliza ENUM para mikrotik/cisco/huawei (remove linux legado).
 * Cobre coluna só 'mikrotik' ou ENUM antigo com linux.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE adm_ssh_devices SET device_type = 'mikrotik' WHERE device_type = 'linux'
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE adm_ssh_devices
      MODIFY COLUMN device_type ENUM('mikrotik', 'cisco', 'huawei')
        NOT NULL
        DEFAULT 'mikrotik'
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE adm_ssh_devices
      MODIFY COLUMN device_type ENUM('linux', 'mikrotik', 'cisco')
        NOT NULL
        DEFAULT 'mikrotik'
    `);
  },
};
