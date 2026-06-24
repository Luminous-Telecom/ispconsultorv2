'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ordem_servico_arquivos', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      ordem_servico_id: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      nome: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      caminho: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      tamanho: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('ordem_servico_arquivos', ['ordem_servico_id']);
    await queryInterface.addIndex('ordem_servico_arquivos', ['empresa_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ordem_servico_arquivos');
  },
};
