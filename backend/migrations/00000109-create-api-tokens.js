'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('api_tokens', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'dados_empresa', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      nome: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Nome descritivo do token (ex: Integração ERP)'
      },
      token_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
        comment: 'SHA-256 do token completo'
      },
      token_prefix: {
        type: Sequelize.STRING(12),
        allowNull: false,
        comment: 'Primeiros caracteres do token para identificação visual'
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      ultimo_uso: {
        type: Sequelize.DATE,
        allowNull: true
      },
      criado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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

    await queryInterface.addIndex('api_tokens', ['empresa_id']);
    await queryInterface.addIndex('api_tokens', ['token_hash']);
    await queryInterface.addIndex('api_tokens', ['ativo']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('api_tokens');
  }
};
