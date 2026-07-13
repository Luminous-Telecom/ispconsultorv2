'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE documentos_modelo
      MODIFY COLUMN tipo ENUM(
        'contrato',
        'recibo',
        'carta',
        'boleto',
        'comprovante',
        'outro',
        'termo',
        'ordem_servico',
        'atendimento'
      ) NOT NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE documentos_modelo
      MODIFY COLUMN tipo ENUM(
        'contrato',
        'recibo',
        'carta',
        'boleto',
        'comprovante',
        'outro',
        'termo'
      ) NOT NULL
    `);
  },
};
