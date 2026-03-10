'use strict';

/**
 * Adiciona dias_desbloqueio_manual em saas_parametros e data_fim_desbloqueio_manual em saas_dados_empresa.
 * Ao desbloquear manualmente, a empresa tem X dias para regularizar. Após o prazo, volta a bloquear.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('saas_parametros', 'dias_desbloqueio_manual', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'Dias de prazo após desbloqueio manual para regularizar títulos. Null = desabilitado'
    });

    await queryInterface.addColumn('saas_dados_empresa', 'data_fim_desbloqueio_manual', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      defaultValue: null,
      comment: 'Até esta data a empresa permanece desbloqueada (desbloqueio manual). Após, rebloqueia se houver atraso'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('saas_parametros', 'dias_desbloqueio_manual');
    await queryInterface.removeColumn('saas_dados_empresa', 'data_fim_desbloqueio_manual');
  }
};
