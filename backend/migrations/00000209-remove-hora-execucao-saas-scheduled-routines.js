'use strict';

/** Remove coluna `hora_execucao` de `saas_saas_scheduled_routines` (horário fica em `minuto`/`hora` cron). */

const TABLE = 'saas_saas_scheduled_routines';

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn(TABLE, 'hora_execucao');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn(TABLE, 'hora_execucao', {
      type: Sequelize.TIME,
      allowNull: false,
      defaultValue: '00:00:00'
    });
  }
};
