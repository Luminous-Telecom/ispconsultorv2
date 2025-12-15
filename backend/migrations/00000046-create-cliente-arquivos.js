'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('cliente_arquivos', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      cliente_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'clientes',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      nome: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      tipo: {
        type: Sequelize.ENUM('documento', 'foto', 'assinatura', 'outro'),
        allowNull: false,
        defaultValue: 'documento'
      },
      caminho: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      tamanho: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      origem: {
        type: Sequelize.ENUM('manual', 'assinatura_digital', 'sistema'),
        allowNull: false,
        defaultValue: 'manual'
      },
      referencia_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      referencia_tipo: {
        type: Sequelize.STRING(100),
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('cliente_arquivos', ['cliente_id']);
    await queryInterface.addIndex('cliente_arquivos', ['tipo']);
    await queryInterface.addIndex('cliente_arquivos', ['origem']);
    await queryInterface.addIndex('cliente_arquivos', ['referencia_tipo', 'referencia_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('cliente_arquivos');
  }
};
