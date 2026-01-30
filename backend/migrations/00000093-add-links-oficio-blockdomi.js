'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('dominios', 'link_oficio_anatel', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('dominios', 'link_oficio_justica', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('ipv4', 'link_oficio_anatel', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('ipv4', 'link_oficio_justica', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('ipv6', 'link_oficio_anatel', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('ipv6', 'link_oficio_justica', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('dominios', 'link_oficio_anatel');
    await queryInterface.removeColumn('dominios', 'link_oficio_justica');
    await queryInterface.removeColumn('ipv4', 'link_oficio_anatel');
    await queryInterface.removeColumn('ipv4', 'link_oficio_justica');
    await queryInterface.removeColumn('ipv6', 'link_oficio_anatel');
    await queryInterface.removeColumn('ipv6', 'link_oficio_justica');
  }
};
