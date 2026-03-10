'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('saas_parametros', 'dias_atraso_bloqueio', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'Número de dias em atraso para bloquear acesso. Null ou 0 = desabilitado'
    });

    await queryInterface.addColumn('saas_dados_empresa', 'bloqueado_por_atraso', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Empresa bloqueada por fatura em atraso além do limite configurado'
    });

    await queryInterface.addIndex('saas_dados_empresa', ['bloqueado_por_atraso']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('saas_parametros', 'dias_atraso_bloqueio');
    await queryInterface.removeColumn('saas_dados_empresa', 'bloqueado_por_atraso');
  }
};
