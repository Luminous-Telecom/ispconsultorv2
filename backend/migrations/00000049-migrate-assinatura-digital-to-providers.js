'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Migrar dados da tabela parametros para assinatura_digital_providers
    const [parametros] = await queryInterface.sequelize.query(
      `SELECT 
        assinatura_digital_habilitado,
        assinatura_digital_api_provider,
        assinatura_digital_api_key,
        assinatura_digital_account_id,
        assinatura_digital_dias_expiracao_padrao
      FROM parametros 
      LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (parametros && parametros.assinatura_digital_api_provider) {
      const provider = parametros.assinatura_digital_api_provider || 'assinafy';
      const habilitado = parametros.assinatura_digital_habilitado || false;
      const apiKey = parametros.assinatura_digital_api_key || null;
      const accountId = parametros.assinatura_digital_account_id || null;
      const diasExpiracao = parametros.assinatura_digital_dias_expiracao_padrao || 30;

      // Verificar se já existe
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM assinatura_digital_providers WHERE provider = :provider LIMIT 1`,
        {
          replacements: { provider: provider },
          type: Sequelize.QueryTypes.SELECT
        }
      );

      if (existing) {
        // Atualizar
        await queryInterface.sequelize.query(
          `UPDATE assinatura_digital_providers SET
            habilitado = :habilitado,
            api_key = :apiKey,
            account_id = :accountId,
            dias_expiracao_padrao = :diasExpiracao,
            updated_at = NOW()
          WHERE provider = :provider`,
          {
            replacements: {
              provider: provider,
              habilitado: habilitado,
              apiKey: apiKey,
              accountId: accountId,
              diasExpiracao: diasExpiracao
            }
          }
        );
      } else {
        // Inserir
        await queryInterface.sequelize.query(
          `INSERT INTO assinatura_digital_providers 
          (provider, habilitado, api_key, account_id, dias_expiracao_padrao, created_at, updated_at)
          VALUES (:provider, :habilitado, :apiKey, :accountId, :diasExpiracao, NOW(), NOW())`,
          {
            replacements: {
              provider: provider,
              habilitado: habilitado,
              apiKey: apiKey,
              accountId: accountId,
              diasExpiracao: diasExpiracao
            }
          }
        );
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Reverter migração: copiar dados de volta para parametros
    const [provider] = await queryInterface.sequelize.query(
      `SELECT * FROM assinatura_digital_providers 
       WHERE habilitado = true 
       ORDER BY id ASC 
       LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (provider) {
      await queryInterface.sequelize.query(
        `UPDATE parametros SET
          assinatura_digital_habilitado = :habilitado,
          assinatura_digital_api_provider = :provider,
          assinatura_digital_api_key = :apiKey,
          assinatura_digital_account_id = :accountId,
          assinatura_digital_dias_expiracao_padrao = :diasExpiracao
        LIMIT 1`,
        {
          replacements: {
            habilitado: provider.habilitado,
            provider: provider.provider,
            apiKey: provider.api_key,
            accountId: provider.account_id,
            diasExpiracao: provider.dias_expiracao_padrao
          }
        }
      );
    }
  }
};

