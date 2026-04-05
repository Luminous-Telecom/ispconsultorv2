'use strict';

/**
 * Copia rotinas de adm_scheduled_routines para saas_scheduled_routines (alvo erp_global).
 *
 * - Tipos padronizados (≠ outros): no máximo uma rotina por tipo — usa a linha com menor id no ADM.
 * - tipo "outros": migra todas as linhas; evita duplicar se já existir no SaaS o mesmo nome com alvo erp_global.
 * - Não insere se já houver no SaaS uma rotina com o mesmo tipo e alvo erp_global (tipos padronizados).
 */
module.exports = {
  async up(queryInterface) {
    const qi = queryInterface.sequelize;

    const cols = `
        nome, tipo, alvo, descricao, configuracao, frequencia,
        dia_execucao, hora_execucao, dia_semana, cron_expression,
        ativo, proxima_execucao, ultima_execucao,
        total_execucoes, execucoes_com_sucesso, execucoes_com_erro,
        created_at, updated_at
      `;

    await qi.query(`
      INSERT INTO saas_scheduled_routines (${cols})
      SELECT
        a.nome,
        a.tipo,
        'erp_global',
        a.descricao,
        a.configuracao,
        a.frequencia,
        a.dia_execucao,
        a.hora_execucao,
        a.dia_semana,
        a.cron_expression,
        a.ativo,
        a.proxima_execucao,
        a.ultima_execucao,
        a.total_execucoes,
        a.execucoes_com_sucesso,
        a.execucoes_com_erro,
        a.created_at,
        a.updated_at
      FROM adm_scheduled_routines a
      INNER JOIN (
        SELECT tipo, MIN(id) AS keep_id
        FROM adm_scheduled_routines
        WHERE tipo <> 'outros'
        GROUP BY tipo
      ) pick ON a.id = pick.keep_id AND a.tipo = pick.tipo
      WHERE NOT EXISTS (
        SELECT 1 FROM saas_scheduled_routines s
        WHERE s.tipo = a.tipo AND s.alvo = 'erp_global'
      )
    `);

    await qi.query(`
      INSERT INTO saas_scheduled_routines (${cols})
      SELECT
        a.nome,
        a.tipo,
        'erp_global',
        a.descricao,
        a.configuracao,
        a.frequencia,
        a.dia_execucao,
        a.hora_execucao,
        a.dia_semana,
        a.cron_expression,
        a.ativo,
        a.proxima_execucao,
        a.ultima_execucao,
        a.total_execucoes,
        a.execucoes_com_sucesso,
        a.execucoes_com_erro,
        a.created_at,
        a.updated_at
      FROM adm_scheduled_routines a
      WHERE a.tipo = 'outros'
        AND NOT EXISTS (
          SELECT 1 FROM saas_scheduled_routines s
          WHERE s.tipo = 'outros'
            AND s.alvo = 'erp_global'
            AND s.nome = a.nome
        )
    `);
  },

  async down() {
    // Migração de dados: reversão manual se necessário (risco de apagar rotinas criadas depois no SaaS).
  },
};
