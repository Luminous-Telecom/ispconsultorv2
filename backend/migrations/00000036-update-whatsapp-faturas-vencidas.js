'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const mensagemPadrao = `🔔 Fatura Vencida!



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

#empresa.razao_social#



(Esta é uma mensagem automática.)`;

    // Lista de tipos de mensagens para faturas VENCIDAS (dias depois do vencimento)
    const tiposMensagensVencidas = [
      '05_dias_depois_vencimento',
      '10_dias_depois_vencimento',
      '15_dias_depois_vencimento',
      '20_dias_depois_vencimento',
      '30_dias_depois_vencimento'
    ];

    // Atualizar mensagem padrão e interações de TODAS as mensagens de faturas vencidas
    for (const tipo of tiposMensagensVencidas) {
      await queryInterface.sequelize.query(`
        UPDATE mensagens_whatsapp 
        SET mensagem_padrao = :mensagemPadrao,
            interacao1 = :interacao1,
            interacao2 = :interacao2,
            interacao3 = :interacao3,
            updated_at = CURRENT_TIMESTAMP
        WHERE tipo = :tipo
      `, {
        replacements: { 
          tipo,
          mensagemPadrao,
          interacao1,
          interacao2,
          interacao3
        }
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Não há como reverter essa alteração sem saber o conteúdo anterior
    // Por isso deixamos vazio
  }
};

