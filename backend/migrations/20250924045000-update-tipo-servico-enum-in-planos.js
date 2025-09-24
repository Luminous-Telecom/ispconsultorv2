'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Alterar tipo_servico para ENUM com os valores do PHP
    await queryInterface.changeColumn('planos', 'tipo_servico', {
      type: Sequelize.ENUM('internet', 'telefonia', 'tv', 'suporte', 'infraestrutura', 'consultoria', 'outros'),
      allowNull: false,
      defaultValue: 'internet'
    });
  },

  async down(queryInterface, Sequelize) {
    // Reverter para STRING
    await queryInterface.changeColumn('planos', 'tipo_servico', {
      type: Sequelize.STRING(100),
      allowNull: true
    });
  }
};

