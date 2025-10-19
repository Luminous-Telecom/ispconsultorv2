'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('documentos_sistema', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nome: {
        type: Sequelize.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      tipo: {
        type: Sequelize.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true,
          isIn: [['contrato', 'recibo', 'boleto', 'comprovante', 'outro']],
        },
      },
      conteudo: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      tamanho_maximo: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10485760, // 10MB em bytes
        validate: {
          min: 1024,
          max: 104857600, // 100MB
        },
      },
      tipos_permitidos: {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: 'pdf,doc,docx,xls,xlsx',
        validate: {
          notEmpty: true,
        },
      },
      retencao_dias: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 365,
        validate: {
          min: 1,
          max: 3650, // 10 anos
        },
      },
      auto_backup: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      criptografia: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      }
    });

    // Adicionar índices
    await queryInterface.addIndex('documentos_sistema', ['ativo']);
    await queryInterface.addIndex('documentos_sistema', ['tipo']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('documentos_sistema');
  }
};
