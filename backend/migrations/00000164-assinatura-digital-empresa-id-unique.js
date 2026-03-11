'use strict';

/** Permite configuração de assinatura digital por empresa (multi-tenant).
 * Remove unique em provider e adiciona unique em (provider, empresa_id).
 */
module.exports = {
  up: async (queryInterface) => {
    try {
      await queryInterface.removeIndex('adm_assinatura_digital_providers', 'unique_provider');
    } catch (e) {
      if (!String(e.message || e).includes("doesn't exist")) throw e;
    }
    await queryInterface.addIndex('adm_assinatura_digital_providers', ['provider', 'empresa_id'], {
      unique: true,
      name: 'unique_provider_empresa'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('adm_assinatura_digital_providers', 'unique_provider_empresa');
    await queryInterface.addIndex('adm_assinatura_digital_providers', ['provider'], {
      unique: true,
      name: 'unique_provider'
    });
  }
};
