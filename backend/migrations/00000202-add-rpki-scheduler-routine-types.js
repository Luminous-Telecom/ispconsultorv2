'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE saas_saas_scheduled_routines
      MODIFY COLUMN tipo ENUM(
        'geracao_titulos',
        'envio_boletos',
        'remessa_bancaria',
        'verificar_vencimentos',
        'desbloquear_blockdomi',
        'bloquear_saas_atraso',
        'backup_equipamentos_ssh',
        'rpki_sync_parent_resources',
        'rpki_sync_repositories',
        'outros'
      ) NOT NULL
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO saas_saas_scheduled_routines (
        nome,
        tipo,
        alvo,
        descricao,
        configuracao,
        frequencia,
        hora_execucao,
        cron_expression,
        ativo,
        proxima_execucao,
        total_execucoes,
        execucoes_com_sucesso,
        execucoes_com_erro,
        created_at,
        updated_at
      )
      SELECT
        'RPKI - Sincronizar recursos de CAs-pai',
        'rpki_sync_parent_resources',
        'erp_global',
        'Sincroniza periodicamente os recursos das CAs-filha com todas as CAs-pai cadastradas.',
        JSON_OBJECT(),
        'personalizada',
        '03:00:00',
        '0 3 * * *',
        1,
        NOW(),
        0,
        0,
        0,
        NOW(),
        NOW()
      FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1
        FROM saas_saas_scheduled_routines
        WHERE tipo = 'rpki_sync_parent_resources' AND alvo = 'erp_global'
      )
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO saas_saas_scheduled_routines (
        nome,
        tipo,
        alvo,
        descricao,
        configuracao,
        frequencia,
        hora_execucao,
        cron_expression,
        ativo,
        proxima_execucao,
        total_execucoes,
        execucoes_com_sucesso,
        execucoes_com_erro,
        created_at,
        updated_at
      )
      SELECT
        'RPKI - Sincronizar repositórios',
        'rpki_sync_repositories',
        'erp_global',
        'Atualiza periodicamente o status de publicação dos repositórios RPKI vinculados às CAs.',
        JSON_OBJECT(),
        'personalizada',
        '03:00:00',
        '*/5 * * * *',
        1,
        NOW(),
        0,
        0,
        0,
        NOW(),
        NOW()
      FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1
        FROM saas_saas_scheduled_routines
        WHERE tipo = 'rpki_sync_repositories' AND alvo = 'erp_global'
      )
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM saas_saas_scheduled_routines
      WHERE tipo IN ('rpki_sync_parent_resources', 'rpki_sync_repositories')
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE saas_saas_scheduled_routines
      MODIFY COLUMN tipo ENUM(
        'geracao_titulos',
        'envio_boletos',
        'remessa_bancaria',
        'verificar_vencimentos',
        'desbloquear_blockdomi',
        'bloquear_saas_atraso',
        'backup_equipamentos_ssh',
        'outros'
      ) NOT NULL
    `);
  }
};

