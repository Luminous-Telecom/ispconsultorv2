'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('atendimentos', {
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
      ixc_id: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      protocolo: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      id_filial: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: '',
      },
      id_estrutura: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: '0',
      },
      id_assunto: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: '',
      },
      id_ticket_setor: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: '',
      },
      id_responsavel_technico: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: '',
      },
      titulo: {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: '',
      },
      menssagem: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      prioridade: {
        type: Sequelize.STRING(1),
        allowNull: false,
        defaultValue: 'N',
      },
      melhor_horario_reserve: {
        type: Sequelize.STRING(1),
        allowNull: false,
        defaultValue: 'Q',
      },
      data_reservada: {
        type: Sequelize.STRING(19),
        allowNull: true,
      },
      su_status: {
        type: Sequelize.STRING(4),
        allowNull: false,
        defaultValue: 'N',
      },
      tipo: {
        type: Sequelize.STRING(4),
        allowNull: false,
        defaultValue: 'E',
      },
      data_criacao: {
        type: Sequelize.STRING(19),
        allowNull: false,
      },
      ultima_atualizacao: {
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

    await queryInterface.addIndex('atendimentos', ['empresa_id']);
    await queryInterface.addIndex('atendimentos', ['cliente_id']);
    await queryInterface.addIndex('atendimentos', ['ixc_id']);
    await queryInterface.addIndex('atendimentos', ['protocolo'], {
      unique: true,
      name: 'atendimentos_protocolo_unique',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('atendimentos');
  },
};
