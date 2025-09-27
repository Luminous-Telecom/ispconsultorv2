'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('scheduled_routines', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nome: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      tipo: {
        type: Sequelize.ENUM('geracao_titulos', 'envio_boletos', 'remessa_bancaria', 'outros'),
        allowNull: false
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      configuracao: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {}
      },
      frequencia: {
        type: Sequelize.ENUM('diaria', 'semanal', 'mensal', 'anual', 'personalizada'),
        allowNull: false
      },
      dia_execucao: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      hora_execucao: {
        type: Sequelize.TIME,
        allowNull: false
      },
      dia_semana: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      cron_expression: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      proxima_execucao: {
        type: Sequelize.DATE,
        allowNull: false
      },
      ultima_execucao: {
        type: Sequelize.DATE,
        allowNull: true
      },
      total_execucoes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      execucoes_com_sucesso: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      execucoes_com_erro: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('scheduled_routines');
  }
};