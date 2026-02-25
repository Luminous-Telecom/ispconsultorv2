'use strict';

/**
 * Corrige títulos com empresa_id null - esses títulos existem no banco
 * mas não aparecem no frontend porque a listagem filtra por empresa_id.
 * Preenche empresa_id a partir do contrato ou do cliente.
 */
module.exports = {
  async up(queryInterface) {
    // Títulos com contrato_id: pegar empresa_id do contrato
    await queryInterface.sequelize.query(`
      UPDATE titulos t
      INNER JOIN contratos c ON t.contrato_id = c.id
      SET t.empresa_id = c.empresa_id
      WHERE t.empresa_id IS NULL AND t.contrato_id IS NOT NULL
    `);

    // Títulos sem contrato ou sem match: pegar empresa_id do cliente
    await queryInterface.sequelize.query(`
      UPDATE titulos t
      INNER JOIN clientes cl ON t.cliente_id = cl.id
      SET t.empresa_id = cl.empresa_id
      WHERE t.empresa_id IS NULL
    `);
  },

  async down() {
    // Não reversível - não zerar empresa_id pois isso quebraria a listagem
  },
};
