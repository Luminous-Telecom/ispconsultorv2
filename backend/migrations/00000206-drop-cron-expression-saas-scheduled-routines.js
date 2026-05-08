'use strict';

/**
 * Remove `cron_expression` de `saas_saas_scheduled_routines`.
 * O agendamento fica só nas colunas minuto, hora, dia_mes, mes, dia_semana.
 */

const TABLE = 'saas_saas_scheduled_routines';

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn(TABLE, 'cron_expression');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn(TABLE, 'cron_expression', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.sequelize.query(
      `UPDATE \`${TABLE}\` SET cron_expression = TRIM(CONCAT_WS(' ', minuto, hora, dia_mes, mes, dia_semana))`
    );
  }
};
