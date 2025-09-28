'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('scheduled_routines', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      nome: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Nome da rotina (ex: Atualizar Cobranças Mensais)'
      },
      tipo: {
        type: Sequelize.ENUM('geracao_titulos', 'envio_boletos', 'remessa_bancaria', 'outros'),
        allowNull: false,
        comment: 'Tipo da rotina'
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Descrição detalhada da rotina'
      },
      configuracao: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Configurações específicas da rotina (JSON)'
      },
      frequencia: {
        type: Sequelize.ENUM('diaria', 'semanal', 'mensal', 'anual', 'personalizada'),
        allowNull: false,
        comment: 'Frequência de execução'
      },
      dia_execucao: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Dia do mês para execução (1-31)'
      },
      hora_execucao: {
        type: Sequelize.TIME,
        allowNull: false,
        defaultValue: '00:00:00',
        comment: 'Hora de execução'
      },
      dia_semana: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Dia da semana (0=domingo, 1=segunda, etc.)'
      },
      cron_expression: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Expressão cron personalizada'
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Se a rotina está ativa'
      },
      ultima_execucao: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Data e hora da última execução'
      },
      proxima_execucao: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Data e hora da próxima execução'
      },
      total_execucoes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total de execuções realizadas'
      },
      execucoes_com_sucesso: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total de execuções com sucesso'
      },
      execucoes_com_erro: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total de execuções com erro'
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

    // Índices para melhor performance
    await queryInterface.addIndex('scheduled_routines', ['tipo']);
    await queryInterface.addIndex('scheduled_routines', ['ativo']);
    await queryInterface.addIndex('scheduled_routines', ['proxima_execucao']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('scheduled_routines');
  }
};
