'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('contas_pagar', 'descricao', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Descrição da conta a pagar'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('contas_pagar', 'descricao');
  }
};

