'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
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
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('routine_execution_logs', ['routine_id']);
    await queryInterface.addIndex('routine_execution_logs', ['status']);
    await queryInterface.addIndex('routine_execution_logs', ['data_inicio']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('routine_execution_logs');
  }
};

