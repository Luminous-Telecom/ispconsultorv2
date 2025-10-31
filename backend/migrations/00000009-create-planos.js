'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('planos', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      nome_plano: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      tipo_servico: {
        type: Sequelize.ENUM('internet', 'telefonia', 'tv', 'suporte', 'infraestrutura', 'consultoria', 'outros'),
        allowNull: false,
        defaultValue: 'internet'
      },
      servicos_inclusos: {
        type: Sequelize.JSON,
        allowNull: true
      },
      quantidade_usuarios: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      valor_mensal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      desconto_percentual: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      desconto_valor: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      desconto_ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      periodicidade: {
        type: Sequelize.ENUM('mensal', 'trimestral', 'semestral', 'anual', 'bimestral', 'quinzenal', 'semanal'),
        allowNull: true,
        defaultValue: 'mensal'
      },
      renovacao_automatica: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      data_inicio: {
        type: Sequelize.DATE,
        allowNull: true
      },
      data_fim: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('ativo', 'inativo', 'cancelado'),
        allowNull: false,
        defaultValue: 'ativo'
      },
      observacoes: {
        type: Sequelize.TEXT,
        allowNull: true
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

    await queryInterface.addIndex('planos', ['status']);
    await queryInterface.addIndex('planos', ['tipo_servico']);
    await queryInterface.addIndex('planos', ['nome_plano']);
    await queryInterface.addIndex('planos', ['data_inicio']);
    await queryInterface.addIndex('planos', ['data_fim']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('planos');
  }
};

