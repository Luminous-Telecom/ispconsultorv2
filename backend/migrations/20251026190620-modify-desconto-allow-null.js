'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Alterar desconto_percentual para allowNull: true
    await queryInterface.changeColumn('contratos', 'desconto_percentual', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: null
    });

    // Alterar desconto_valor para allowNull: true
    await queryInterface.changeColumn('contratos', 'desconto_valor', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null
    });
  },

  async down (queryInterface, Sequelize) {
    // Reverter desconto_percentual para allowNull: false
    await queryInterface.changeColumn('contratos', 'desconto_percentual', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    });

    // Reverter desconto_valor para allowNull: false
    await queryInterface.changeColumn('contratos', 'desconto_valor', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    });
  }
};
