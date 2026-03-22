'use strict';

/**
 * Novo tipo de rotina ERP: backup de equipamentos SSH com backup_enabled.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE adm_scheduled_routines
      MODIFY COLUMN tipo ENUM(
        'geracao_titulos',
        'envio_boletos',
        'remessa_bancaria',
        'verificar_vencimentos',
        'desbloquear_blockdomi',
        'backup_equipamentos_ssh',
        'outros'
      ) NOT NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE adm_scheduled_routines SET tipo = 'outros' WHERE tipo = 'backup_equipamentos_ssh'
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE adm_scheduled_routines
      MODIFY COLUMN tipo ENUM(
        'geracao_titulos',
        'envio_boletos',
        'remessa_bancaria',
        'verificar_vencimentos',
        'desbloquear_blockdomi',
        'outros'
      ) NOT NULL
    `);
  },
};
