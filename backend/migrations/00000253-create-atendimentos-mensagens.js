'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('atendimentos_mensagens', {
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
      atendimento_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'atendimentos',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ixc_id: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      mensagem: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      data: {
        type: Sequelize.STRING(19),
        allowNull: false,
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      visibilidade_mensagens: {
        type: Sequelize.STRING(1),
        allowNull: false,
        defaultValue: 'E',
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

    await queryInterface.addIndex('atendimentos_mensagens', ['atendimento_id']);
    await queryInterface.addIndex('atendimentos_mensagens', ['empresa_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('atendimentos_mensagens');
  },
};
