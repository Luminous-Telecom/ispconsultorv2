'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('clientes', 'central_assinante_senha', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Senha hash para acesso à central do assinante'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('clientes', 'central_assinante_senha');
  }
};
