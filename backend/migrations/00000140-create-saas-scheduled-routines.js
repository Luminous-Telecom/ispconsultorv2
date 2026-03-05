'use strict';

/**
 * Tabela saas_scheduled_routines - Agendador isolado para SaaS
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('saas_scheduled_routines', {
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
        type: Sequelize.ENUM('geracao_titulos', 'envio_boletos', 'remessa_bancaria', 'verificar_vencimentos', 'desbloquear_blockdomi', 'outros'),
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
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('saas_scheduled_routines');
  }
};
