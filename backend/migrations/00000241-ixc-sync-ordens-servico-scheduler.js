'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
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
        'Sincronizar ordens de serviço IXC',
        'ixc_sync_ordens_servico',
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
        FROM saas_scheduled_routines
        WHERE tipo = 'ixc_sync_ordens_servico' AND alvo = 'erp_global'
      )
    `);

    const table = await queryInterface.describeTable('ordens_servico_mensagens');
    if (!table.ixc_id) {
      await queryInterface.addColumn('ordens_servico_mensagens', 'ixc_id', {
        type: Sequelize.STRING(32),
        allowNull: true,
      });
      await queryInterface.addIndex('ordens_servico_mensagens', ['ordem_servico_id', 'ixc_id'], {
        name: 'ordens_servico_mensagens_ordem_ixc_id_idx',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM saas_scheduled_routines
      WHERE tipo = 'ixc_sync_ordens_servico'
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
        'outros'
      ) NOT NULL
    `);

    const table = await queryInterface.describeTable('ordens_servico_mensagens');
    if (table.ixc_id) {
      await queryInterface.removeIndex(
        'ordens_servico_mensagens',
        'ordens_servico_mensagens_ordem_ixc_id_idx'
      );
      await queryInterface.removeColumn('ordens_servico_mensagens', 'ixc_id');
    }
  },
};
