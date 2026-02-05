'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('dominios', 'link_planilha_dominios', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('ipv4', 'link_planilha_dominios', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('ipv6', 'link_planilha_dominios', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('dominios', 'link_planilha_dominios');
    await queryInterface.removeColumn('ipv4', 'link_planilha_dominios');
    await queryInterface.removeColumn('ipv6', 'link_planilha_dominios');
  }
};
