'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('modelo_contrato', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      nome: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      tipo: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      conteudo: {
        type: Sequelize.TEXT('long'),
        allowNull: true
      },
      conteudo_adesao: {
        type: Sequelize.TEXT('long'),
        allowNull: true
      },
      conteudo_permanencia: {
        type: Sequelize.TEXT('long'),
        allowNull: true
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      tamanho_maximo: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10485760
      },
      tipos_permitidos: {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: 'pdf,doc,docx,xls,xlsx'
      },
      retencao_dias: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 365
      },
      auto_backup: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      criptografia: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

    await queryInterface.addIndex('modelo_contrato', ['ativo']);
    await queryInterface.addIndex('modelo_contrato', ['tipo']);

    // Criar tabelas relacionadas ao modelo_contrato
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

    await queryInterface.addIndex('modelo_termo_adesao', ['modelo_contrato_id']);
    await queryInterface.addIndex('modelo_contrato_conteudo', ['modelo_contrato_id']);
    await queryInterface.addIndex('modelo_contrato_permanencia', ['modelo_contrato_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('modelo_contrato_permanencia');
    await queryInterface.dropTable('modelo_contrato_conteudo');
    await queryInterface.dropTable('modelo_termo_adesao');
    await queryInterface.dropTable('modelo_contrato');
  }
};

