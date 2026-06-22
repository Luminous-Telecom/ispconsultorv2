'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('adm_sistema_rotina_execucoes', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      routine_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      routine_nome: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      routine_tipo: {
        type: Sequelize.STRING(80),
        allowNull: false,
        defaultValue: 'unknown',
      },
      origem: {
        type: Sequelize.ENUM('erp', 'saas'),
        allowNull: false,
        defaultValue: 'erp',
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('executando', 'sucesso', 'erro'),
        allowNull: false,
        defaultValue: 'executando',
      },
      data_inicio: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      data_fim: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      duracao_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      resultado: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      erro: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('adm_sistema_rotina_execucoes', ['routine_id', 'created_at'], {
      name: 'idx_rotina_exec_routine_created',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('adm_sistema_rotina_execucoes');
  },
};
