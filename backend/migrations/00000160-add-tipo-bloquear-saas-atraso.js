'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE saas_scheduled_routines
      MODIFY COLUMN tipo ENUM(
        'geracao_titulos',
        'envio_boletos',
        'remessa_bancaria',
        'verificar_vencimentos',
        'desbloquear_blockdomi',
        'bloquear_saas_atraso',
        'outros'
      ) NOT NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE saas_scheduled_routines
      MODIFY COLUMN tipo ENUM(
        'geracao_titulos',
        'envio_boletos',
        'remessa_bancaria',
        'verificar_vencimentos',
        'desbloquear_blockdomi',
        'outros'
      ) NOT NULL
    `);
  }
};
