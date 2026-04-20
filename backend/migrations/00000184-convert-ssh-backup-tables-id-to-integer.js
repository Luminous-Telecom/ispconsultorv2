'use strict';

/**
 * Ambientes que já rodaram 00000176 / 00000182 com UUID no `id` passam a usar
 * INTEGER AUTO_INCREMENT, alinhado ao restante do ERP (ex.: saas_dados_empresa).
 * Instalações novas (176/182 já com INTEGER) ignoram esta migration.
 */

async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT TABLE_NAME AS n FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t LIMIT 1`,
    { replacements: { t: tableName } }
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function idColumnType(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT COLUMN_TYPE AS ct FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_NAME = 'id' LIMIT 1`,
    { replacements: { t: tableName } }
  );
  const ct = rows[0]?.ct;
  return ct != null ? String(ct) : null;
}

function isIntegerLike(columnType) {
  if (!columnType) return false;
  const s = columnType.toLowerCase();
  return /^(tiny|small|medium|big)?int\b/.test(s);
}

/**
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {string} tableName
 */
async function convertPkToAutoInt(queryInterface, tableName) {
  if (!(await tableExists(queryInterface, tableName))) return;
  const ct = await idColumnType(queryInterface, tableName);
  if (!ct || isIntegerLike(ct)) return;

  const q = queryInterface.sequelize;
  const esc = `\`${String(tableName).replace(/`/g, '``')}\``;

  await q.query(
    `ALTER TABLE ${esc} ADD COLUMN \`__bn_id_mig\` INT NOT NULL AUTO_INCREMENT UNIQUE FIRST`
  );
  await q.query(`ALTER TABLE ${esc} DROP PRIMARY KEY`);
  await q.query(`ALTER TABLE ${esc} DROP COLUMN \`id\``);
  await q.query(`ALTER TABLE ${esc} CHANGE COLUMN \`__bn_id_mig\` \`id\` INT NOT NULL AUTO_INCREMENT`);
  await q.query(`ALTER TABLE ${esc} ADD PRIMARY KEY (\`id\`)`);
}

module.exports = {
  async up(queryInterface) {
    await convertPkToAutoInt(queryInterface, 'adm_ssh_device_backup_events');
    await convertPkToAutoInt(queryInterface, 'adm_ssh_device_backups');
  },

  async down() {
    // Reverter CHAR(36) / UUID perderia correspondência estável; não suportado.
  },
};
