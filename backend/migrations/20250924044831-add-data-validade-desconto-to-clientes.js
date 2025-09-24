'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('clientes');
    
    if (!tableDescription.data_validade_desconto) {
      await queryInterface.addColumn('clientes', 'data_validade_desconto', {
        type: Sequelize.DATEONLY,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('clientes');
    
    if (tableDescription.data_validade_desconto) {
      await queryInterface.removeColumn('clientes', 'data_validade_desconto');
    }
  }
};