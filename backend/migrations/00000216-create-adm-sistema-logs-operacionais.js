'use strict';

/**
 * Log operacional unificado no MySQL (não é auditoria de CRUD — essa segue no Elasticsearch).
 * Inspirado em modelo legado (operador, data, tipo, tabela, id, campos JSON, IP), com nomes próprios.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('adm_sistema_logs_operacionais', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'adm_sistema_dados_empresa', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'adm_cadastros_usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      /** Origem do evento (ex.: api, job, sistema, integracao) */
      canal: {
        type: Sequelize.STRING(24),
        allowNull: false,
        defaultValue: 'sistema',
      },
      /** Classificação curta do evento (ex.: rotina_execucao, envio_email) */
      tipo: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      /** Entidade lógica afetada (ex.: titulo, ssh_device) — análogo conceitual a “tabela” */
      recurso: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      /** Identificador da entidade (string para suportar UUID ou numérico serializado) */
      recurso_id: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      /** Dados estruturados do evento — análogo a “campos” JSON */
      payload: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      mensagem: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('adm_sistema_logs_operacionais', ['empresa_id', 'created_at'], {
      name: 'idx_adm_sistema_logs_op_empresa_created',
    });
    await queryInterface.addIndex('adm_sistema_logs_operacionais', ['tipo', 'created_at'], {
      name: 'idx_adm_sistema_logs_op_tipo_created',
    });
    await queryInterface.addIndex('adm_sistema_logs_operacionais', ['recurso', 'created_at'], {
      name: 'idx_adm_sistema_logs_op_recurso_created',
    });
    await queryInterface.addIndex('adm_sistema_logs_operacionais', ['usuario_id', 'created_at'], {
      name: 'idx_adm_sistema_logs_op_usuario_created',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('adm_sistema_logs_operacionais');
  },
};
