'use strict';

/**
 * Atualiza saas_planos para incluir recursos.modulos baseado no formato antigo.
 * Starter: cadastros, financeiro
 * Professional: cadastros, financeiro, envio_notificacoes, historico_notificacoes, assinatura_digital, nfse
 * Enterprise: todos os módulos incluindo blockdomi
 */
module.exports = {
  async up(queryInterface) {
    const [planos] = await queryInterface.sequelize.query(
      `SELECT id, nome, recursos FROM saas_planos`
    );

    for (const plano of planos) {
      let recursos = {};
      try {
        recursos = typeof plano.recursos === 'string' ? JSON.parse(plano.recursos) : (plano.recursos || {});
      } catch {
        recursos = {};
      }

      const modulos = [];
      modulos.push('cadastros');
      if (recursos.financeiro === true) modulos.push('financeiro');
      if (recursos.blockdomi === true) modulos.push('blockdomi');
      if (recursos.whatsapp === true) modulos.push('envio_notificacoes');
      modulos.push('historico_notificacoes', 'assinatura_digital');
      if (recursos.nfse === true) modulos.push('nfse');

      const novosRecursos = { ...recursos, modulos: [...new Set(modulos)] };
      await queryInterface.sequelize.query(
        `UPDATE saas_planos SET recursos = ? WHERE id = ?`,
        { replacements: [JSON.stringify(novosRecursos), plano.id] }
      );
    }
  },

  async down(queryInterface) {
    const [planos] = await queryInterface.sequelize.query(
      `SELECT id, recursos FROM saas_planos`
    );

    for (const plano of planos) {
      let recursos = {};
      try {
        recursos = typeof plano.recursos === 'string' ? JSON.parse(plano.recursos) : (plano.recursos || {});
      } catch {
        continue;
      }
      delete recursos.modulos;
      await queryInterface.sequelize.query(
        `UPDATE saas_planos SET recursos = ? WHERE id = ?`,
        { replacements: [JSON.stringify(recursos), plano.id] }
      );
    }
  },
};
