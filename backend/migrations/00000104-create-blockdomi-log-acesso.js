'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('blockdomi_log_acesso', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      ip: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IP do cliente (IPv4 ou IPv6)'
      },
      rota: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Ex: /domain/version, /domain/all, /v4/all, /v6/all'
      },
      metodo: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'GET'
      },
      status_http: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Código HTTP da resposta (200, 403, 500, etc)'
      },
      sucesso: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'true se status_http < 400'
      },
      mensagem_erro: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Mensagem de erro quando sucesso = false'
      },
      user_agent: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.addIndex('blockdomi_log_acesso', ['created_at']);
    await queryInterface.addIndex('blockdomi_log_acesso', ['ip']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('blockdomi_log_acesso');
  }
};
