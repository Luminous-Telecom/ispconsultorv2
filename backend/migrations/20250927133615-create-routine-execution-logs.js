'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('routine_execution_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      routine_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'scheduled_routines',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('executando', 'sucesso', 'erro'),
        allowNull: false
      },
      data_inicio: {
        type: Sequelize.DATE,
        allowNull: false
      },
      data_fim: {
        type: Sequelize.DATE,
        allowNull: true
      },
      duracao_ms: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      resultado: {
        type: Sequelize.JSON,
        allowNull: true
      },
      erro: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      stack_trace: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      mensagem: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      detalhes: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('routine_execution_logs');
  }
};