'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remover coluna conteudo da tabela termos_contrato
    await queryInterface.removeColumn('termos_contrato', 'conteudo');
  },

  down: async (queryInterface, Sequelize) => {
    // Adicionar coluna conteudo de volta (caso precise reverter)
    await queryInterface.addColumn('termos_contrato', 'conteudo', {
      type: Sequelize.TEXT('long'),
      allowNull: false,
      defaultValue: ''
    });
  }
};