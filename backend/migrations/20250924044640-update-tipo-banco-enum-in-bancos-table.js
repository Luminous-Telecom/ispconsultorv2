'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('bancos', 'tipo_banco', {
      type: Sequelize.ENUM('efi', 'asaas'),
      allowNull: false,
      defaultValue: 'efi'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('bancos', 'tipo_banco', {
      type: Sequelize.ENUM('efi', 'asaas', 'geral'),
      allowNull: false,
      defaultValue: 'geral'
    });
  }
};