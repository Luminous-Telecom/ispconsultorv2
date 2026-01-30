'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('dominios', 'nome_oficio', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.addColumn('ipv4', 'nome_oficio', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.addColumn('ipv6', 'nome_oficio', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('dominios', 'nome_oficio');
    await queryInterface.removeColumn('ipv4', 'nome_oficio');
    await queryInterface.removeColumn('ipv6', 'nome_oficio');
  }
};
