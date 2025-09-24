'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('planos');
    if (tableDescription.status) {
      await queryInterface.changeColumn('planos', 'status', {
        type: Sequelize.ENUM('ativo', 'suspenso', 'cancelado'),
        allowNull: false,
        defaultValue: 'ativo'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('planos');
    if (tableDescription.status) {
      await queryInterface.changeColumn('planos', 'status', {
        type: Sequelize.ENUM('ativo', 'inativo', 'suspenso'),
        allowNull: false,
        defaultValue: 'ativo'
      });
    }
  }
};
