'use strict';

/**
 * Padroniza tabelas do serviço Blockdomi no formato adm_blockdomi_*.
 * Ex.: adm_ipv4 -> adm_blockdomi_ipv4.
 */

const RENAMES = [
  ['adm_dominios', 'adm_blockdomi_dominios'],
  ['adm_ipv4', 'adm_blockdomi_ipv4'],
  ['adm_ipv6', 'adm_blockdomi_ipv6'],
  ['adm_ips_permitidos_blockdomi', 'adm_blockdomi_ips_permitidos'],
  ['adm_versoes_blockdomi', 'adm_blockdomi_versoes'],
  ['adm_numeros_sei_anatel_blockdomi', 'adm_blockdomi_numeros_sei_anatel'],
];

async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
    { replacements: [tableName] }
  );
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  async up(queryInterface) {
    for (const [oldName, newName] of RENAMES) {
      const oldExists = await tableExists(queryInterface, oldName);
      const newExists = await tableExists(queryInterface, newName);
      if (oldExists && !newExists) {
        await queryInterface.renameTable(oldName, newName);
      }
    }
  },

  async down(queryInterface) {
    const reverse = [...RENAMES].reverse().map(([oldName, newName]) => [newName, oldName]);
    for (const [oldName, newName] of reverse) {
      const oldExists = await tableExists(queryInterface, oldName);
      const newExists = await tableExists(queryInterface, newName);
      if (oldExists && !newExists) {
        await queryInterface.renameTable(oldName, newName);
      }
    }
  },
};
