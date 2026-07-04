'use strict';

const TABLE_NAME = 'cadastros_planos';
const COLUMN_NAME = 'renovacao_automatica';

async function columnExists(queryInterface) {
  const table = await queryInterface.describeTable(TABLE_NAME);
  return Boolean(table[COLUMN_NAME]);
}

module.exports = {
  async up(queryInterface) {
    if (await columnExists(queryInterface)) {
      await queryInterface.removeColumn(TABLE_NAME, COLUMN_NAME);
    }
  },

  async down(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface))) {
      await queryInterface.addColumn(TABLE_NAME, COLUMN_NAME, {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }
  },
};
