'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
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

    await queryInterface.addIndex('modelo_carta', ['ativo']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('modelo_carta');
  }
};

