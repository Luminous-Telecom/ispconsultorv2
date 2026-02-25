'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('templates_whatsapp', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Multi-tenant'
      },
      nome: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Nome do template na Meta (ex: fatura_disponivel_dev)'
      },
      idioma: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pt_BR',
        comment: 'Idioma: pt_BR, en, etc.'
      },
      variables: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON array com ordem das variáveis (ex: ["cliente.razao_social", "titulo.valor_final"])'
      },
      header_document: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Se o template usa documento no header'
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    await queryInterface.addIndex('templates_whatsapp', ['empresa_id']);
    await queryInterface.addIndex('templates_whatsapp', ['nome', 'idioma']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('templates_whatsapp');
  }
};
