'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Criar tabela modelo_recibo
    await queryInterface.createTable('modelo_recibo', {
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
      conteudo: {
        type: Sequelize.TEXT('long'),
        allowNull: false
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

    // Criar tabela modelo_carta
    await queryInterface.createTable('modelo_carta', {
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
      conteudo: {
        type: Sequelize.TEXT('long'),
        allowNull: false
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

    // Criar tabela modelo_contrato
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

    // Criar índices
    await queryInterface.addIndex('modelo_recibo', ['ativo']);
    await queryInterface.addIndex('modelo_carta', ['ativo']);
    await queryInterface.addIndex('modelo_contrato', ['ativo']);
    await queryInterface.addIndex('modelo_contrato', ['tipo']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('modelo_contrato');
    await queryInterface.dropTable('modelo_carta');
    await queryInterface.dropTable('modelo_recibo');
  }
};

