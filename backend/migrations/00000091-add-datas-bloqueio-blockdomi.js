'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('dominios', 'data_inicio_bloqueio', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await queryInterface.addColumn('dominios', 'data_fim_bloqueio', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await queryInterface.addColumn('ipv4', 'data_inicio_bloqueio', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await queryInterface.addColumn('ipv4', 'data_fim_bloqueio', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await queryInterface.addColumn('ipv6', 'data_inicio_bloqueio', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await queryInterface.addColumn('ipv6', 'data_fim_bloqueio', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('dominios', 'data_inicio_bloqueio');
    await queryInterface.removeColumn('dominios', 'data_fim_bloqueio');
    await queryInterface.removeColumn('ipv4', 'data_inicio_bloqueio');
    await queryInterface.removeColumn('ipv4', 'data_fim_bloqueio');
    await queryInterface.removeColumn('ipv6', 'data_inicio_bloqueio');
    await queryInterface.removeColumn('ipv6', 'data_fim_bloqueio');
  }
};
