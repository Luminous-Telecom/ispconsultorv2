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
        'consulta_titulos_asaas',
        'consulta_titulos_efi',
        'outros'
      ) NOT NULL
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO saas_saas_scheduled_routines (
        nome,
        tipo,
        alvo,
        minuto,
        hora,
        dia_mes,
        mes,
        dia_semana,
        ativo,
        proxima_execucao,
        total_execucoes,
        execucoes_com_sucesso,
        execucoes_com_erro,
        created_at,
        updated_at
      )
      SELECT
        'Consulta títulos Asaas',
        'consulta_titulos_asaas',
        'erp_global',
        '*/30',
        '*',
        '*',
        '*',
        '*',
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
        WHERE tipo = 'consulta_titulos_asaas' AND alvo = 'erp_global'
      )
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO saas_saas_scheduled_routines (
        nome,
        tipo,
        alvo,
        minuto,
        hora,
        dia_mes,
        mes,
        dia_semana,
        ativo,
        proxima_execucao,
        total_execucoes,
        execucoes_com_sucesso,
        execucoes_com_erro,
        created_at,
        updated_at
      )
      SELECT
        'Consulta títulos Efi',
        'consulta_titulos_efi',
        'erp_global',
        '*/30',
        '*',
        '*',
        '*',
        '*',
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
        WHERE tipo = 'consulta_titulos_efi' AND alvo = 'erp_global'
      )
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM saas_saas_scheduled_routines
      WHERE tipo IN ('consulta_titulos_asaas', 'consulta_titulos_efi')
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
        'rpki_sync_parent_resources',
        'rpki_sync_repositories',
        'outros'
      ) NOT NULL
    `);
  },
};
