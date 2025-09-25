'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Alterar o tipo do campo valor_primeiro_titulo de DECIMAL para VARCHAR
    await queryInterface.changeColumn('clientes', 'valor_primeiro_titulo', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Valor do primeiro título: total, proporcional ou valor numérico'
    });
  },

  async down(queryInterface, Sequelize) {
    // Reverter para DECIMAL
    await queryInterface.changeColumn('clientes', 'valor_primeiro_titulo', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });
  }
};
