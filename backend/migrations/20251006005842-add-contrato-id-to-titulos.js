'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Adicionar a coluna contrato_id sem foreign key por enquanto
    await queryInterface.addColumn('titulos', 'contrato_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'ID do contrato relacionado'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('titulos', 'contrato_id');
  }
};
