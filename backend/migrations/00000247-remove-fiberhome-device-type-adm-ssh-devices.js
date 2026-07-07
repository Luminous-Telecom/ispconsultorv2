'use strict';

/** Remove tipo FiberHome AN5000 (backup não estável). */

async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    { replacements: [tableName] }
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function resolveSshDevicesTable(queryInterface) {
  const candidates = ['ssh_manager_devices', 'adm_ssh_manager_ssh_devices', 'adm_ssh_devices'];
  for (const name of candidates) {
    if (await tableExists(queryInterface, name)) return name;
  }
  throw new Error(
    'Tabela de equipamentos SSH não encontrada (ssh_manager_devices / adm_ssh_manager_ssh_devices / adm_ssh_devices).'
  );
}

module.exports = {
  async up(queryInterface) {
    const table = await resolveSshDevicesTable(queryInterface);
    await queryInterface.sequelize.query(`
      UPDATE \`${table}\` SET device_type = 'mikrotik' WHERE device_type = 'fiberhome'
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE \`${table}\`
      MODIFY COLUMN device_type ENUM('mikrotik', 'cisco', 'huawei', 'swos')
        NOT NULL
        DEFAULT 'mikrotik'
    `);
  },

  async down(queryInterface) {
    const table = await resolveSshDevicesTable(queryInterface);
    await queryInterface.sequelize.query(`
      ALTER TABLE \`${table}\`
      MODIFY COLUMN device_type ENUM('mikrotik', 'cisco', 'huawei', 'swos', 'fiberhome')
        NOT NULL
        DEFAULT 'mikrotik'
    `);
  },
};
