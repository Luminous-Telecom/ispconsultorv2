'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('servidores_whatsapp', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      evolution_api_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      evolution_api_key: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      instance_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      qr_code: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status_conexao: {
        type: Sequelize.ENUM('disconnected', 'connecting', 'connected', 'qr_required'),
        allowNull: false,
        defaultValue: 'disconnected',
      },
      webhook_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      webhook_events: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      notificacoes_automaticas: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      timeout: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30000,
      },
      tentativas: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      intervalo_tentativas: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5000,
      },
      configuracao_extra: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      }
    });

    // Adicionar índices
    await queryInterface.addIndex('servidores_whatsapp', ['ativo'], {
      unique: true,
      where: { ativo: true }
    });
    await queryInterface.addIndex('servidores_whatsapp', ['instance_name']);
    await queryInterface.addIndex('servidores_whatsapp', ['status_conexao']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('servidores_whatsapp');
  }
};