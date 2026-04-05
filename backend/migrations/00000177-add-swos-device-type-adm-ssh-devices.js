'use strict';

/** Classificação MikroTik SwOS (gerenciamento é HTTP; não há túnel SSH). */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE adm_ssh_devices
      MODIFY COLUMN device_type ENUM('mikrotik', 'cisco', 'huawei', 'swos')
        NOT NULL
        DEFAULT 'mikrotik'
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE adm_ssh_devices SET device_type = 'mikrotik' WHERE device_type = 'swos'
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE adm_ssh_devices
      MODIFY COLUMN device_type ENUM('mikrotik', 'cisco', 'huawei')
        NOT NULL
        DEFAULT 'mikrotik'
    `);
  },
};
