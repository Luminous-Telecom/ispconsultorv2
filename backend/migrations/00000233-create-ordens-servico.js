'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ordens_servico', {
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
      cliente_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      prioridade: {
        type: Sequelize.STRING(1),
        allowNull: false,
        defaultValue: 'N',
      },
      melhor_horario_agenda: {
        type: Sequelize.STRING(1),
        allowNull: false,
        defaultValue: 'Q',
      },
      data_agenda: {
        type: Sequelize.STRING(19),
        allowNull: true,
      },
      mensagem: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(4),
        allowNull: false,
        defaultValue: 'A',
      },
      protocolo: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      data_abertura: {
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

    await queryInterface.addIndex('ordens_servico', ['empresa_id']);
    await queryInterface.addIndex('ordens_servico', ['cliente_id']);
    await queryInterface.addIndex('ordens_servico', ['protocolo']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ordens_servico');
  },
};
