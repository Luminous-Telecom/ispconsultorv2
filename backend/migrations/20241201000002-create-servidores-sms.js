'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('servidores_sms', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      provedor: {
        type: Sequelize.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true,
          isIn: [['twilio', 'aws', 'zapier', 'custom']],
        },
      },
      api_key: {
        type: Sequelize.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      api_secret: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      sender_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      webhook_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
        validate: {
          isUrl: true,
        },
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      timeout: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30000,
        validate: {
          min: 1000,
          max: 300000,
        },
      },
      tentativas: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
        validate: {
          min: 1,
          max: 10,
        },
      },
      intervalo_tentativas: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5000,
        validate: {
          min: 1000,
          max: 60000,
        },
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
    await queryInterface.addIndex('servidores_sms', ['ativo']);
    await queryInterface.addIndex('servidores_sms', ['provedor']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('servidores_sms');
  }
};
