'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('assinatura_digital_providers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      provider: {
        type: Sequelize.ENUM('assinafy', 'zapsign', 'govbr', 'outro'),
        allowNull: false,
        unique: true,
        comment: 'Tipo do provider de assinatura digital'
      },
      habilitado: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Se o provider está habilitado'
      },
      api_key: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'API Key do provider'
      },
      account_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Account ID específico (ex: Workspace Account ID da Assinafy)'
      },
      configuracao_extra: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Configurações extras específicas do provider em formato JSON'
      },
      dias_expiracao_padrao: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30,
        comment: 'Dias padrão para expiração de documentos'
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

    // Índices
    await queryInterface.addIndex('assinatura_digital_providers', ['provider'], {
      unique: true,
      name: 'unique_provider'
    });

    await queryInterface.addIndex('assinatura_digital_providers', ['habilitado'], {
      name: 'idx_habilitado'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('assinatura_digital_providers');
  }
};

