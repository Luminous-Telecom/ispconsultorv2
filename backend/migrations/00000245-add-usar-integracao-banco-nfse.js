'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cadastros_bancos', 'usar_integracao_banco_nfse', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('saas_bancos', 'usar_integracao_banco_nfse', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('saas_bancos', 'usar_integracao_banco_nfse');
    await queryInterface.removeColumn('cadastros_bancos', 'usar_integracao_banco_nfse');
  },
};
