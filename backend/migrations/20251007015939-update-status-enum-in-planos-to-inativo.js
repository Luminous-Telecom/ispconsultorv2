'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Primeiro, atualizar registros existentes que têm 'suspenso' para 'inativo'
    await queryInterface.sequelize.query(
      "UPDATE planos SET status = 'inativo' WHERE status = 'suspenso'"
    );

    // Alterar ENUM do status para incluir 'inativo' em vez de 'suspenso'
    await queryInterface.changeColumn('planos', 'status', {
      type: Sequelize.ENUM('ativo', 'inativo', 'cancelado'),
      allowNull: false,
      defaultValue: 'ativo'
    });
  },

  async down (queryInterface, Sequelize) {
    // Primeiro, atualizar registros existentes que têm 'inativo' para 'suspenso'
    await queryInterface.sequelize.query(
      "UPDATE planos SET status = 'suspenso' WHERE status = 'inativo'"
    );

    // Reverter ENUM do status para incluir 'suspenso' em vez de 'inativo'
    await queryInterface.changeColumn('planos', 'status', {
      type: Sequelize.ENUM('ativo', 'suspenso', 'cancelado'),
      allowNull: false,
      defaultValue: 'ativo'
    });
  }
};
