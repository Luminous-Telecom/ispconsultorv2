'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const mensagemPadrao = `🔔 Sua Fatura Vence Hoje!



Olá, #cliente.razao_social#!

Confira os detalhes da sua fatura:

📄 Dados da Fatura:

• Vencimento: #titulo.vencimento#

• Valor: #titulo.valor#

💳 Opções de Pagamento:

• Pix

• Linha Digitavel

Ambos seguem na sequencia:`;

    const interacao1 = `#titulo.codigo_pix#`;

    const interacao2 = `#titulo.codigo_barras#`;

    const interacao3 = `Lembrete: Efetue o pagamento até a data de vencimento para evitar juros.

Caso o pagamento já tenha sido realizado, desconsidere este aviso.

Atenciosamente,
Luminous Telecom Consultoria

(Esta é uma mensagem automática.)`;

    // Atualizar apenas a mensagem do mesmo dia de vencimento
    await queryInterface.sequelize.query(`
      INSERT INTO mensagens_whatsapp 
        (tipo, tipo_envio, mensagem_padrao, interacao1, interacao2, interacao3, ativo, created_at, updated_at)
      VALUES 
        ('mesmo_dia_vencimento', 'pdf', :mensagemPadrao, :interacao1, :interacao2, :interacao3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        mensagem_padrao = :mensagemPadrao,
        interacao1 = :interacao1,
        interacao2 = :interacao2,
        interacao3 = :interacao3,
        updated_at = CURRENT_TIMESTAMP
    `, {
      replacements: { 
        mensagemPadrao,
        interacao1,
        interacao2,
        interacao3
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Não há como reverter essa alteração sem saber o conteúdo anterior
    // Por isso deixamos vazio
  }
};

