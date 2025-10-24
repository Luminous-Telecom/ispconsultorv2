'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Criar tabela sem foreign key primeiro
    await queryInterface.createTable('termos_contrato', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      contrato_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      tipo_termo: {
        type: Sequelize.ENUM('adesao', 'permanencia', 'cancelamento', 'alteracao'),
        allowNull: false
      },
      conteudo: {
        type: Sequelize.TEXT('long'),
        allowNull: false
      },
      data_aceite: {
        type: Sequelize.DATE,
        allowNull: true
      },
      aceito_por: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      observacoes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Adicionar índices
    await queryInterface.addIndex('termos_contrato', ['contrato_id']);
    await queryInterface.addIndex('termos_contrato', ['tipo_termo']);
    await queryInterface.addIndex('termos_contrato', ['ativo']);
    await queryInterface.addIndex('termos_contrato', ['contrato_id', 'tipo_termo'], {
      unique: true,
      name: 'unique_contrato_tipo_termo'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('termos_contrato');
  }
};
