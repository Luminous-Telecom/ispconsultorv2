'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('parametros', 'validar_cep', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'validar_cpf_cnpj'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('parametros', 'validar_cep');
  }
};

