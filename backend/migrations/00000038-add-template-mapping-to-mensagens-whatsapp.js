'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Adicionar coluna template_mapping na tabela mensagens_whatsapp
    await queryInterface.addColumn('mensagens_whatsapp', 'template_mapping', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON com configuração do template (name, language, variables) para WhatsApp Cloud API'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('mensagens_whatsapp', 'template_mapping');
  }
};

