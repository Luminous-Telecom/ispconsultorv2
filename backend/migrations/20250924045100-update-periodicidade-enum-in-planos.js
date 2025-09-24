'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Alterar periodicidade para ENUM com os valores específicos
    await queryInterface.changeColumn('planos', 'periodicidade', {
      type: Sequelize.ENUM('mensal', 'trimestral', 'semestral', 'anual', 'bimestral', 'quinzenal', 'semanal'),
      allowNull: true,
      defaultValue: 'mensal'
    });
  },

  async down(queryInterface, Sequelize) {
    // Reverter para STRING
    await queryInterface.changeColumn('planos', 'periodicidade', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'mensal'
    });
  }
};
