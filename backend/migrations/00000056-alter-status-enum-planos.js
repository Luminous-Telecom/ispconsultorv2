'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Primeiro, atualizar registros com status 'cancelado' ou 'suspenso' para 'inativo'
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET status = 'inativo' 
      WHERE status IN ('cancelado', 'suspenso')
    `);

    // No MariaDB/MySQL, alterar o ENUM diretamente
    await queryInterface.changeColumn('planos', 'status', {
      type: Sequelize.ENUM('ativo', 'inativo'),
      allowNull: false,
      defaultValue: 'ativo',
      comment: 'Status do plano'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Restaurar os valores originais do ENUM
    await queryInterface.changeColumn('planos', 'status', {
      type: Sequelize.ENUM('ativo', 'inativo', 'cancelado', 'suspenso'),
      allowNull: false,
      defaultValue: 'ativo',
      comment: 'Status do plano'
    });
  }
};

