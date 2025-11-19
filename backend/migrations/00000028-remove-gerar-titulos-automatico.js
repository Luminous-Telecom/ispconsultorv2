'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('parametros', 'gerar_titulos_automatico');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('parametros', 'gerar_titulos_automatico', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'validar_cpf_cnpj'
    });
  }
};

