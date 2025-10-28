'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Criar tabela modelo_termo_adesao
    await queryInterface.createTable('modelo_termo_adesao', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      modelo_contrato_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'modelo_contrato',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      modelo: {
        type: Sequelize.TEXT('long'),
        allowNull: false
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

    // Criar tabela modelo_contrato_conteudo
    await queryInterface.createTable('modelo_contrato_conteudo', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      modelo_contrato_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'modelo_contrato',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      modelo: {
        type: Sequelize.TEXT('long'),
        allowNull: false
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

    // Criar tabela modelo_contrato_permanencia
    await queryInterface.createTable('modelo_contrato_permanencia', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      modelo_contrato_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'modelo_contrato',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      modelo: {
        type: Sequelize.TEXT('long'),
        allowNull: false
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

    // Criar índices
    await queryInterface.addIndex('modelo_termo_adesao', ['modelo_contrato_id']);
    await queryInterface.addIndex('modelo_contrato_conteudo', ['modelo_contrato_id']);
    await queryInterface.addIndex('modelo_contrato_permanencia', ['modelo_contrato_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('modelo_contrato_permanencia');
    await queryInterface.dropTable('modelo_contrato_conteudo');
    await queryInterface.dropTable('modelo_termo_adesao');
  }
};

