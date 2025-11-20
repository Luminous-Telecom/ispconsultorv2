'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Adicionar campo mensagem_manual em mensagens_whatsapp
    await queryInterface.addColumn('mensagens_whatsapp', 'mensagem_manual', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
      comment: 'Mensagem para envio manual de cobrança via WhatsApp'
    });

    // Adicionar campo mensagem_manual em mensagens_email
    await queryInterface.addColumn('mensagens_email', 'mensagem_manual', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
      comment: 'Mensagem para envio manual de cobrança via Email'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('mensagens_whatsapp', 'mensagem_manual');
    await queryInterface.removeColumn('mensagens_email', 'mensagem_manual');
  }
};

