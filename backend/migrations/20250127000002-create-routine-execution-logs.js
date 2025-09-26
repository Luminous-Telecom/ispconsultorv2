'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('routine_execution_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      routine_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'scheduled_routines',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID da rotina executada'
      },
      status: {
        type: Sequelize.ENUM('sucesso', 'erro', 'executando'),
        allowNull: false,
        comment: 'Status da execução'
      },
      data_inicio: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Data e hora de início da execução'
      },
      data_fim: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Data e hora de fim da execução'
      },
      duracao_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Duração da execução em milissegundos'
      },
      resultado: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Resultado da execução (JSON)'
      },
      erro: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Mensagem de erro, se houver'
      },
      stack_trace: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Stack trace do erro, se houver'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Índices para melhor performance
    await queryInterface.addIndex('routine_execution_logs', ['routine_id']);
    await queryInterface.addIndex('routine_execution_logs', ['status']);
    await queryInterface.addIndex('routine_execution_logs', ['data_inicio']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('routine_execution_logs');
  }
};
