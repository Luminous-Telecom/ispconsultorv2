'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Criar tabela para conteúdo do modelo de contrato
    await queryInterface.createTable('conteudo_modelo_contrato', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      modelo_contrato_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'modelo_contrato',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      conteudo: {
        type: Sequelize.TEXT('long'),
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Criar tabela para conteúdo do termo de adesão
    await queryInterface.createTable('conteudo_termo_adesao', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      modelo_contrato_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'modelo_contrato',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      conteudo: {
        type: Sequelize.TEXT('long'),
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Criar tabela para conteúdo do contrato de permanência
    await queryInterface.createTable('conteudo_contrato_permanencia', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      modelo_contrato_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'modelo_contrato',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      conteudo: {
        type: Sequelize.TEXT('long'),
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Adicionar índices para melhor performance
    await queryInterface.addIndex('conteudo_modelo_contrato', ['modelo_contrato_id']);
    await queryInterface.addIndex('conteudo_termo_adesao', ['modelo_contrato_id']);
    await queryInterface.addIndex('conteudo_contrato_permanencia', ['modelo_contrato_id']);
  },

  async down(queryInterface, Sequelize) {
    // Remover índices
    await queryInterface.removeIndex('conteudo_modelo_contrato', ['modelo_contrato_id']);
    await queryInterface.removeIndex('conteudo_termo_adesao', ['modelo_contrato_id']);
    await queryInterface.removeIndex('conteudo_contrato_permanencia', ['modelo_contrato_id']);

    // Remover tabelas
    await queryInterface.dropTable('conteudo_contrato_permanencia');
    await queryInterface.dropTable('conteudo_termo_adesao');
    await queryInterface.dropTable('conteudo_modelo_contrato');
  }
};
