'use strict';

/**
 * Parâmetro ERP: dias em atraso para suspender contratos.
 * Rotina diária no agendador SaaS (alvo ERP global).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('sistema_parametros');
    if (!table.dias_suspender_atraso) {
      await queryInterface.addColumn('sistema_parametros', 'dias_suspender_atraso', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
      });
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE saas_scheduled_routines
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
        'ixc_sync_ordens_servico',
        'suspender_contratos_atraso',
        'outros'
      ) NOT NULL
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO saas_scheduled_routines (
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
        'Suspender contratos por atraso',
        'suspender_contratos_atraso',
        'erp_global',
        '0',
        '6',
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
        FROM saas_scheduled_routines
        WHERE tipo = 'suspender_contratos_atraso' AND alvo = 'erp_global'
      )
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM saas_scheduled_routines
      WHERE tipo = 'suspender_contratos_atraso'
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE saas_scheduled_routines
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
        'ixc_sync_ordens_servico',
        'outros'
      ) NOT NULL
    `);

    const table = await queryInterface.describeTable('sistema_parametros');
    if (table.dias_suspender_atraso) {
      await queryInterface.removeColumn('sistema_parametros', 'dias_suspender_atraso');
    }
  },
};
