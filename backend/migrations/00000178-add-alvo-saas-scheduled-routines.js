'use strict';

/**
 * alvo: separa rotinas da cobrança do produto SaaS (saas) das rotinas globais do ERP (erp_global — um agendamento para todos os clientes/empresas).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('saas_scheduled_routines', 'alvo', {
      type: Sequelize.ENUM('saas', 'erp_global'),
      allowNull: false,
      defaultValue: 'saas'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('saas_scheduled_routines', 'alvo');
  }
};
