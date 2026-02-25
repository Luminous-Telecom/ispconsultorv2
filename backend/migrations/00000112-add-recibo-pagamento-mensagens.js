'use strict';

const RECIBO_EMAIL_PADRAO = `<p>Olá, #cliente.razao_social#!</p>
<p>Confirmamos o recebimento do seu pagamento.</p>
<p><strong>Recibo de pagamento</strong></p>
<ul>
  <li><strong>Título:</strong> #titulo.numero#</li>
  <li><strong>Valor pago:</strong> #titulo.valor_pago#</li>
  <li><strong>Data do pagamento:</strong> #titulo.pagamento#</li>
  <li><strong>Vencimento:</strong> #titulo.vencimento#</li>
</ul>
<p>Agradecemos a preferência.</p>
<p>#empresa.nome_fantasia#</p>`;

const RECIBO_WHATSAPP_PADRAO = `Olá, #cliente.razao_social#! ✅

Confirmamos o recebimento do seu pagamento.

*Recibo*
• Título: #titulo.numero#
• Valor pago: #titulo.valor_pago#
• Data do pagamento: #titulo.pagamento#
• Vencimento: #titulo.vencimento#

Agradecemos a preferência.
#empresa.nome_fantasia#`;

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      INSERT INTO mensagens_email (tipo, tipo_envio, mensagem_padrao, ativo, created_at, updated_at)
      VALUES ('recibo_pagamento', 'pdf', :emailPadrao, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE mensagem_padrao = :emailPadrao, updated_at = CURRENT_TIMESTAMP
    `, {
      replacements: { emailPadrao: RECIBO_EMAIL_PADRAO }
    });

    await queryInterface.sequelize.query(`
      INSERT INTO mensagens_whatsapp (tipo, tipo_envio, mensagem_padrao, ativo, created_at, updated_at)
      VALUES ('recibo_pagamento', 'pdf', :whatsappPadrao, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE mensagem_padrao = :whatsappPadrao, updated_at = CURRENT_TIMESTAMP
    `, {
      replacements: { whatsappPadrao: RECIBO_WHATSAPP_PADRAO }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      "DELETE FROM mensagens_email WHERE tipo = 'recibo_pagamento'"
    );
    await queryInterface.sequelize.query(
      "DELETE FROM mensagens_whatsapp WHERE tipo = 'recibo_pagamento'"
    );
  }
};
