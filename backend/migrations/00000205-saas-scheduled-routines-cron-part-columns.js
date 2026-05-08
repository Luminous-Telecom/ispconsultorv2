'use strict';

/**
 * Colunas de agendamento no formato cron por campo (minuto, hora, dia_mes, mes, dia_semana),
 * id_tarefa e status — alinhado ao modelo de tabela por expressão cron.
 * Preserva backup de dia_semana (INT) antes de trocar o campo para VARCHAR com o token cron.
 */

function padTimeParts(horaExec) {
  if (horaExec == null) return ['00', '00'];
  const s = String(horaExec);
  const timePart = s.includes('T') ? s.split('T')[1] || s : s;
  const p = timePart.split(':');
  const hh = String(parseInt(p[0] || '0', 10) || 0).padStart(2, '0');
  const mm = String(parseInt(p[1] || '0', 10) || 0).padStart(2, '0');
  return [hh, mm];
}

function buildLegacyCronExpression(row) {
  const [hh, mm] = padTimeParts(row.hora_execucao);
  const freq = row.frequencia || 'diaria';
  const cronExpr = (row.cron_expression || '').trim();
  if (freq === 'personalizada' && cronExpr) return cronExpr;
  const ds = row.dia_semana != null && row.dia_semana !== '' ? String(row.dia_semana) : '0';
  const de = row.dia_execucao != null && row.dia_execucao !== '' ? String(row.dia_execucao) : '1';
  switch (freq) {
    case 'diaria':
      return `${mm} ${hh} * * *`;
    case 'semanal':
      return `${mm} ${hh} * * ${ds}`;
    case 'mensal':
      return `${mm} ${hh} ${de} * *`;
    case 'anual':
      return `${mm} ${hh} ${de} 1 *`;
    default:
      return `${mm} ${hh} * * *`;
  }
}

function fiveTokensFromExpression(expr) {
  const t = String(expr || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (t.length >= 6) return t.slice(1, 6);
  if (t.length === 5) return t;
  return ['*', '*', '*', '*', '*'];
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'saas_saas_scheduled_routines';

    await queryInterface.addColumn(table, 'dia_semana_int_backup', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.sequelize.query(
      `UPDATE \`${table}\` SET dia_semana_int_backup = dia_semana WHERE dia_semana IS NOT NULL`
    );

    await queryInterface.addColumn(table, 'id_tarefa', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn(table, 'minuto', {
      type: Sequelize.STRING(128),
      allowNull: false,
      defaultValue: '*'
    });
    await queryInterface.addColumn(table, 'hora', {
      type: Sequelize.STRING(128),
      allowNull: false,
      defaultValue: '*'
    });
    await queryInterface.addColumn(table, 'dia_mes', {
      type: Sequelize.STRING(128),
      allowNull: false,
      defaultValue: '*'
    });
    await queryInterface.addColumn(table, 'mes', {
      type: Sequelize.STRING(128),
      allowNull: false,
      defaultValue: '*'
    });
    await queryInterface.addColumn(table, 'dia_semana_cron', {
      type: Sequelize.STRING(128),
      allowNull: false,
      defaultValue: '*'
    });
    await queryInterface.addColumn(table, 'status', {
      type: Sequelize.CHAR(1),
      allowNull: false,
      defaultValue: 'A'
    });

    const [rows] = await queryInterface.sequelize.query(
      `SELECT id, frequencia, hora_execucao, dia_execucao, dia_semana, cron_expression, ativo FROM \`${table}\``
    );

    for (const row of rows) {
      const expr = buildLegacyCronExpression(row);
      const [m, h, dom, month, dow] = fiveTokensFromExpression(expr);
      const st = row.ativo === 1 || row.ativo === true ? 'A' : 'I';
      await queryInterface.sequelize.query(
        `UPDATE \`${table}\` SET minuto = :m, hora = :h, dia_mes = :dom, mes = :month, dia_semana_cron = :dow, cron_expression = :expr, id_tarefa = :tid, status = :st WHERE id = :rid`,
        { replacements: { m, h, dom, month, dow, expr, tid: row.id, st, rid: row.id } }
      );
    }

    await queryInterface.removeColumn(table, 'dia_semana');
    await queryInterface.renameColumn(table, 'dia_semana_cron', 'dia_semana');

    await queryInterface.removeColumn(table, 'dia_semana_int_backup');
  },

  async down(queryInterface, Sequelize) {
    const table = 'saas_saas_scheduled_routines';

    await queryInterface.addColumn(table, 'dia_semana_num', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.sequelize.query(
      `UPDATE \`${table}\` SET dia_semana_num = CAST(dia_semana AS UNSIGNED) WHERE dia_semana REGEXP '^[0-9]+$' AND CAST(dia_semana AS UNSIGNED) BETWEEN 0 AND 6`
    );

    await queryInterface.removeColumn(table, 'dia_semana');
    await queryInterface.renameColumn(table, 'dia_semana_num', 'dia_semana');

    await queryInterface.removeColumn(table, 'id_tarefa');
    await queryInterface.removeColumn(table, 'minuto');
    await queryInterface.removeColumn(table, 'hora');
    await queryInterface.removeColumn(table, 'dia_mes');
    await queryInterface.removeColumn(table, 'mes');
    await queryInterface.removeColumn(table, 'status');
  }
};