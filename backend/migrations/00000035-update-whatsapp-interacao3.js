'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const interacao3 = `Lembrete: Efetue o pagamento até a data de vencimento para evitar juros.



Caso o pagamento já tenha sido realizado, desconsidere este aviso.



Atenciosamente,

#empresa.razao_social#



(Esta é uma mensagem automática.)`;

    // Lista de todos os tipos de mensagens WhatsApp
    const tiposMensagens = [
      '10_dias_antes_vencimento',
      '05_dias_antes_vencimento',
      'mesmo_dia_vencimento',
      '05_dias_depois_vencimento',
      '10_dias_depois_vencimento',
      '15_dias_depois_vencimento',
      '20_dias_depois_vencimento',
      '30_dias_depois_vencimento'
    ];

    // Atualizar interacao3 de TODAS as mensagens WhatsApp
    for (const tipo of tiposMensagens) {
      await queryInterface.sequelize.query(`
        UPDATE mensagens_whatsapp 
        SET interacao3 = :interacao3,
            updated_at = CURRENT_TIMESTAMP
        WHERE tipo = :tipo
      `, {
        replacements: { 
          tipo,
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

