'use strict';

/**
 * Centraliza logs dispersos em adm_sistema_logs_operacionais e remove tabelas antigas.
 */

const TABELAS_REMOVER = [
  'adm_sistema_rotina_execucoes',
  'adm_ssh_manager_audit_logs',
  'adm_blockdomi_log_acesso',
  'rpki_activity_logs',
  'rpki_sync_logs',
  'rpki_validation_logs',
];

async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    { replacements: [tableName] }
  );
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;

    if (await tableExists(queryInterface, 'adm_sistema_rotina_execucoes')) {
      await q.query(`
        INSERT INTO adm_sistema_logs_operacionais
          (empresa_id, usuario_id, canal, tipo, tabela, recurso, recurso_id, payload, mensagem, created_at)
        SELECT
          r.empresa_id,
          NULL,
          'job',
          'executou',
          CASE WHEN r.origem = 'saas' THEN 'saas_saas_scheduled_routines' ELSE 'adm_sistema_scheduled_routines' END,
          CASE WHEN r.origem = 'saas' THEN 'SaasScheduledRoutine' ELSE 'ScheduledRoutine' END,
          CAST(r.routine_id AS CHAR),
          JSON_OBJECT(
            'log_contexto', 'rotina_execucao',
            'routine_id', r.routine_id,
            'routine_nome', r.routine_nome,
            'routine_tipo', r.routine_tipo,
            'origem', r.origem,
            'status', r.status,
            'data_inicio', DATE_FORMAT(r.data_inicio, '%Y-%m-%dT%H:%i:%s.000Z'),
            'data_fim', IF(r.data_fim IS NULL, NULL, DATE_FORMAT(r.data_fim, '%Y-%m-%dT%H:%i:%s.000Z')),
            'duracao_ms', r.duracao_ms,
            'resultado', r.resultado,
            'erro', r.erro
          ),
          CONCAT('Rotina "', r.routine_nome, '" (', r.routine_tipo, ')'),
          r.created_at
        FROM adm_sistema_rotina_execucoes r
      `);
    }

    if (await tableExists(queryInterface, 'adm_ssh_manager_audit_logs')) {
      await q.query(`
        INSERT INTO adm_sistema_logs_operacionais
          (empresa_id, usuario_id, canal, tipo, recurso, recurso_id, payload, ip_address, mensagem, created_at)
        SELECT
          s.empresa_id,
          CASE WHEN s.user_id REGEXP '^[0-9]+$' THEN CAST(s.user_id AS UNSIGNED) ELSE NULL END,
          'ssh',
          'auditoria',
          'SshDevice',
          s.device_id,
          JSON_OBJECT(
            'log_contexto', 'ssh_audit',
            'action', s.action,
            'user_id', s.user_id,
            'device_id', s.device_id,
            'device_name', s.device_name,
            'command', s.command,
            'output', s.output,
            'success', s.success,
            'error_message', s.error_message,
            'duration', s.duration
          ),
          s.ip,
          CONCAT(s.action, IF(s.device_name IS NOT NULL, CONCAT(' · ', s.device_name), '')),
          s.created_at
        FROM adm_ssh_manager_audit_logs s
      `);
    }

    if (await tableExists(queryInterface, 'adm_blockdomi_log_acesso')) {
      await q.query(`
        INSERT INTO adm_sistema_logs_operacionais
          (empresa_id, usuario_id, canal, tipo, recurso, payload, ip_address, user_agent, mensagem, created_at)
        SELECT
          b.empresa_id,
          NULL,
          'blockdomi',
          'acesso',
          'BlockdomiLogAcesso',
          JSON_OBJECT(
            'log_contexto', 'blockdomi_acesso',
            'ip', b.ip,
            'rota', b.rota,
            'metodo', b.metodo,
            'status_http', b.status_http,
            'sucesso', b.sucesso,
            'mensagem_erro', b.mensagem_erro,
            'user_agent', b.user_agent
          ),
          b.ip,
          b.user_agent,
          CONCAT(b.metodo, ' ', b.rota, ' → ', b.status_http),
          b.created_at
        FROM adm_blockdomi_log_acesso b
      `);
    }

    if (await tableExists(queryInterface, 'rpki_activity_logs')) {
      await q.query(`
        INSERT INTO adm_sistema_logs_operacionais
          (empresa_id, usuario_id, canal, tipo, recurso, recurso_id, payload, mensagem, created_at)
        SELECT
          a.empresa_id,
          NULL,
          'rpki',
          'atividade',
          CASE WHEN a.object_type = 'roa' THEN 'RpkiRoa' ELSE 'RpkiAspa' END,
          IF(a.object_id IS NULL, NULL, CAST(a.object_id AS CHAR)),
          JSON_OBJECT(
            'log_contexto', 'rpki_activity',
            'ca_id', a.ca_id,
            'object_type', a.object_type,
            'object_id', a.object_id,
            'action', a.action,
            'details', a.details
          ),
          CONCAT(a.action, ' ', a.object_type, IF(a.object_id IS NOT NULL, CONCAT(' #', a.object_id), '')),
          a.created_at
        FROM rpki_activity_logs a
      `);
    }

    if (await tableExists(queryInterface, 'rpki_sync_logs')) {
      await q.query(`
        INSERT INTO adm_sistema_logs_operacionais
          (empresa_id, usuario_id, canal, tipo, recurso, recurso_id, payload, mensagem, created_at)
        SELECT
          s.empresa_id,
          NULL,
          'rpki',
          'sync',
          'RpkiCa',
          IF(s.ca_id IS NULL, NULL, CAST(s.ca_id AS CHAR)),
          JSON_OBJECT(
            'log_contexto', 'rpki_sync',
            'ca_id', s.ca_id,
            'sync_type', s.type,
            'trigger_type', s.trigger_type,
            'status', s.status,
            'remote_host', s.remote_host,
            'message', s.message
          ),
          s.message,
          s.created_at
        FROM rpki_sync_logs s
      `);
    }

    if (await tableExists(queryInterface, 'rpki_validation_logs')) {
      await q.query(`
        INSERT INTO adm_sistema_logs_operacionais
          (empresa_id, usuario_id, canal, tipo, recurso, payload, ip_address, mensagem, created_at)
        SELECT
          v.empresa_id,
          NULL,
          'rpki',
          'validacao',
          'RpkiValidation',
          JSON_OBJECT(
            'log_contexto', 'rpki_validation',
            'prefix', v.prefix,
            'asn', CAST(v.asn AS CHAR),
            'prefix_length', v.prefix_length,
            'state', v.state,
            'matched_roa_id', v.matched_roa_id,
            'reason', v.reason
          ),
          v.request_ip,
          CONCAT(v.prefix, ' AS', CAST(v.asn AS CHAR), ' → ', v.state),
          v.created_at
        FROM rpki_validation_logs v
      `);
    }

    for (const tableName of TABELAS_REMOVER) {
      if (await tableExists(queryInterface, tableName)) {
        await queryInterface.dropTable(tableName);
      }
    }
  },

  async down() {
    // Migração destrutiva — dados permanecem em adm_sistema_logs_operacionais.
  },
};
