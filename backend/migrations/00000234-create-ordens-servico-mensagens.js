'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ordens_servico_mensagens', {
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
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ordens_servico',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      id_evento: {
        type: Sequelize.STRING(4),
        allowNull: false,
        defaultValue: '12',
      },
      mensagem: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      data: {
        type: Sequelize.STRING(19),
        allowNull: false,
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

    await queryInterface.addIndex('ordens_servico_mensagens', ['ordem_servico_id']);
    await queryInterface.addIndex('ordens_servico_mensagens', ['empresa_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ordens_servico_mensagens');
  },
};
