'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Adicionar coluna assinado na tabela termos_contrato
    await queryInterface.addColumn('termos_contrato', 'assinado', {
      type: Sequelize.ENUM('SIM', 'NAO'),
      allowNull: false,
      defaultValue: 'NAO'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remover coluna assinado
    await queryInterface.removeColumn('termos_contrato', 'assinado');
  }
};
