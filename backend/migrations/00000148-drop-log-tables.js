'use strict';

/**
 * Remove tabelas de log - todos os logs agora vão para Elasticsearch.
 * Tabelas removidas: adm_auditoria, adm_routine_execution_logs, adm_blockdomi_log_acesso
 * (saas_logs_acesso nunca criada - 128 é no-op)
 */
module.exports = {
  async up(queryInterface) {
    const tables = [
      'adm_routine_execution_logs',
      'adm_blockdomi_log_acesso',
      'adm_auditoria'
    ];
    for (const table of tables) {
      try {
        await queryInterface.dropTable(table);
      } catch (err) {
        const msg = err.message || '';
        if (!msg.includes("doesn't exist") && !msg.includes('Unknown table')) {
          throw err;
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('adm_auditoria', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      usuario_id: { type: Sequelize.INTEGER, allowNull: true },
      acao: { type: Sequelize.STRING(50), allowNull: false },
      entidade: { type: Sequelize.STRING(100), allowNull: false },
      entidade_id: { type: Sequelize.INTEGER, allowNull: true },
      dados_anteriores: { type: Sequelize.JSON, allowNull: true },
      dados_novos: { type: Sequelize.JSON, allowNull: true },
      ip_address: { type: Sequelize.STRING(50), allowNull: true },
      user_agent: { type: Sequelize.STRING(500), allowNull: true },
      observacoes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false }
    });

    await queryInterface.createTable('adm_routine_execution_logs', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      routine_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'adm_scheduled_routines', key: 'id' } },
      status: { type: Sequelize.ENUM('executando', 'sucesso', 'erro'), allowNull: false },
      data_inicio: { type: Sequelize.DATE, allowNull: false },
      data_fim: { type: Sequelize.DATE, allowNull: true },
      duracao_ms: { type: Sequelize.INTEGER, allowNull: true },
      resultado: { type: Sequelize.JSON, allowNull: true },
      erro: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false }
    });

    await queryInterface.createTable('adm_blockdomi_log_acesso', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      ip: { type: Sequelize.STRING(50), allowNull: true },
      rota: { type: Sequelize.STRING(255), allowNull: false },
      metodo: { type: Sequelize.STRING(10), allowNull: false },
      status_http: { type: Sequelize.INTEGER, allowNull: false },
      sucesso: { type: Sequelize.BOOLEAN, allowNull: false },
      mensagem_erro: { type: Sequelize.TEXT, allowNull: true },
      user_agent: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false }
    });
  },
};
