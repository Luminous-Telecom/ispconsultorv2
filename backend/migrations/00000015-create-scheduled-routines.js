'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('scheduled_routines', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nome: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      tipo: {
        type: Sequelize.ENUM('geracao_titulos', 'envio_boletos', 'remessa_bancaria', 'outros'),
        allowNull: false
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      configuracao: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {}
      },
      frequencia: {
        type: Sequelize.ENUM('diaria', 'semanal', 'mensal', 'anual', 'personalizada'),
        allowNull: false
      },
      dia_execucao: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      hora_execucao: {
        type: Sequelize.TIME,
        allowNull: false
      },
      dia_semana: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      cron_expression: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      proxima_execucao: {
        type: Sequelize.DATE,
        allowNull: false
      },
      ultima_execucao: {
        type: Sequelize.DATE,
        allowNull: true
      },
      total_execucoes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      execucoes_com_sucesso: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      execucoes_com_erro: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

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

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('routine_execution_logs');
    await queryInterface.dropTable('scheduled_routines');
  }
};

