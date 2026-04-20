'use strict';

/**
 * Converte ids de UUID/CHAR(36) para INTEGER AUTO_INCREMENT.
 * Idempotente e usa transação para fixar a conexão (FOREIGN_KEY_CHECKS).
 */

async function colType(q, table, column) {
  const [rows] = await q(
    'SELECT COLUMN_TYPE AS ct FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=:table AND COLUMN_NAME=:column LIMIT 1',
    { replacements: { table, column } },
  );
  const ct = rows[0]?.ct;
  return ct != null ? String(ct) : null;
}

function isInt(t) {
  return t != null && /^(tiny|small|medium|big)?int\b/i.test(t);
}

async function colExists(q, table, column) {
  return (await colType(q, table, column)) != null;
}

async function fkExists(q, table, constraintName) {
  const [rows] = await q(
    'SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=:table AND CONSTRAINT_NAME=:cn AND CONSTRAINT_TYPE="FOREIGN KEY" LIMIT 1',
    { replacements: { table, cn: constraintName } },
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function indexExists(q, table, indexName) {
  const [rows] = await q(
    'SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=:table AND INDEX_NAME=:idx GROUP BY INDEX_NAME LIMIT 1',
    { replacements: { table, idx: indexName } },
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function step(label, fn) {
  console.log(`  → ${label}`);
  await fn();
}

module.exports = {
  async up(queryInterface) {
    const s = queryInterface.sequelize;
    const t = await s.transaction();
    const q = (sql, opts = {}) => s.query(sql, { ...opts, transaction: t });

    try {
      await step('SET FOREIGN_KEY_CHECKS=0', () => q('SET FOREIGN_KEY_CHECKS=0'));

      // ── Drop FKs que criamos (se existirem) ─────────────────────────────
      for (const [tbl, cn] of [
        ['adm_ssh_devices', 'adm_ssh_devices_agent_fk'],
        ['adm_ssh_device_backups', 'adm_ssh_device_backups_device_fk'],
        ['adm_ssh_device_backup_events', 'adm_ssh_device_backup_events_device_fk'],
        // Instalações antigas: Sequelize nomeava a FK de ssh_device_id como ibfk_1
        ['adm_ssh_device_backup_events', 'adm_ssh_device_backup_events_ibfk_1'],
      ]) {
        if (await fkExists(q, tbl, cn)) {
          await step(`DROP FK ${cn}`, () => q(`ALTER TABLE \`${tbl}\` DROP FOREIGN KEY \`${cn}\``));
        }
      }

      // ── Mapeamento agentes ───────────────────────────────────────────────
      const agentsIdT = await colType(q, 'adm_agents', 'id');
      await step('Recriar _bn_mig_agent_map', async () => {
        await q('DROP TABLE IF EXISTS _bn_mig_agent_map');
        if (!isInt(agentsIdT)) {
          await q('CREATE TABLE _bn_mig_agent_map (old_id CHAR(36) NOT NULL PRIMARY KEY, new_id INT NOT NULL) ENGINE=InnoDB');
          await q('INSERT INTO _bn_mig_agent_map (old_id, new_id) SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) FROM adm_agents');
        }
      });

      // ── Mapeamento devices ───────────────────────────────────────────────
      const devicesIdT = await colType(q, 'adm_ssh_devices', 'id');
      await step('Recriar _bn_mig_device_map', async () => {
        await q('DROP TABLE IF EXISTS _bn_mig_device_map');
        if (!isInt(devicesIdT)) {
          await q('CREATE TABLE _bn_mig_device_map (old_id CHAR(36) NOT NULL PRIMARY KEY, new_id INT NOT NULL) ENGINE=InnoDB');
          await q('INSERT INTO _bn_mig_device_map (old_id, new_id) SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) FROM adm_ssh_devices');
        }
      });

      // ── adm_ssh_devices.agent_id ─────────────────────────────────────────
      const agentIdT = await colType(q, 'adm_ssh_devices', 'agent_id');
      if (agentIdT != null && !isInt(agentIdT)) {
        await step('Migrar adm_ssh_devices.agent_id para INT', async () => {
          if (!(await colExists(q, 'adm_ssh_devices', 'agent_id_new'))) {
            await q('ALTER TABLE adm_ssh_devices ADD COLUMN agent_id_new INT NULL DEFAULT NULL');
            await q('UPDATE adm_ssh_devices d LEFT JOIN _bn_mig_agent_map m ON d.agent_id = m.old_id SET d.agent_id_new = m.new_id');
          }
          await q('ALTER TABLE adm_ssh_devices DROP COLUMN agent_id, CHANGE COLUMN agent_id_new agent_id INT NULL DEFAULT NULL');
        });
      } else if (agentIdT != null && isInt(agentIdT) && (await colExists(q, 'adm_ssh_devices', 'agent_id_new'))) {
        await step('Limpar coluna agent_id_new orfã', () => q('ALTER TABLE adm_ssh_devices DROP COLUMN agent_id_new'));
      }

      // ── adm_ssh_device_backups.ssh_device_id ────────────────────────────
      await step('Migrar adm_ssh_device_backups.ssh_device_id', async () => {
        const sshT = await colType(q, 'adm_ssh_device_backups', 'ssh_device_id');
        const newE = await colExists(q, 'adm_ssh_device_backups', 'ssh_device_id_new');

        if (sshT != null && !isInt(sshT)) {
          // Popula/atualiza coluna _new
          if (!newE) {
            await q('ALTER TABLE adm_ssh_device_backups ADD COLUMN ssh_device_id_new INT NULL DEFAULT NULL');
          }
          await q('UPDATE adm_ssh_device_backups b INNER JOIN _bn_mig_device_map m ON b.ssh_device_id = m.old_id SET b.ssh_device_id_new = m.new_id');

          // Remove índices/uniques que contêm ssh_device_id antes de dropar a coluna
          for (const idx of [
            'adm_ssh_device_backups_device_file_unique',
            'adm_ssh_device_backups_ssh_device_id',
          ]) {
            if (await indexExists(q, 'adm_ssh_device_backups', idx)) {
              await q(`ALTER TABLE adm_ssh_device_backups DROP INDEX \`${idx}\``);
            }
          }

          await q('ALTER TABLE adm_ssh_device_backups DROP COLUMN ssh_device_id, CHANGE COLUMN ssh_device_id_new ssh_device_id INT NOT NULL');

          // Recria unique (ssh_device_id, file_name) com o novo tipo
          if (!(await indexExists(q, 'adm_ssh_device_backups', 'adm_ssh_device_backups_device_file_unique'))) {
            await q('ALTER TABLE adm_ssh_device_backups ADD UNIQUE KEY adm_ssh_device_backups_device_file_unique (ssh_device_id, file_name)');
          }
        } else if (newE && !sshT) {
          await q('ALTER TABLE adm_ssh_device_backups CHANGE COLUMN ssh_device_id_new ssh_device_id INT NOT NULL');
        } else if (newE && sshT && isInt(sshT)) {
          await q('ALTER TABLE adm_ssh_device_backups DROP COLUMN ssh_device_id_new');
        }
      });

      // ── adm_ssh_device_backup_events.ssh_device_id ──────────────────────
      await step('Migrar adm_ssh_device_backup_events.ssh_device_id', async () => {
        const sshT = await colType(q, 'adm_ssh_device_backup_events', 'ssh_device_id');
        const newE = await colExists(q, 'adm_ssh_device_backup_events', 'ssh_device_id_new');

        if (sshT != null && !isInt(sshT)) {
          if (!newE) {
            await q('ALTER TABLE adm_ssh_device_backup_events ADD COLUMN ssh_device_id_new INT NULL DEFAULT NULL');
          }
          await q('UPDATE adm_ssh_device_backup_events e INNER JOIN _bn_mig_device_map m ON e.ssh_device_id = m.old_id SET e.ssh_device_id_new = m.new_id');

          // Remove índice em ssh_device_id antes de dropar
          for (const idx of ['adm_ssh_device_backup_events_ssh_device_id']) {
            if (await indexExists(q, 'adm_ssh_device_backup_events', idx)) {
              await q(`ALTER TABLE adm_ssh_device_backup_events DROP INDEX \`${idx}\``);
            }
          }

          await q('ALTER TABLE adm_ssh_device_backup_events DROP COLUMN ssh_device_id, CHANGE COLUMN ssh_device_id_new ssh_device_id INT NOT NULL');
        } else if (newE && !sshT) {
          await q('ALTER TABLE adm_ssh_device_backup_events CHANGE COLUMN ssh_device_id_new ssh_device_id INT NOT NULL');
        } else if (newE && sshT && isInt(sshT)) {
          await q('ALTER TABLE adm_ssh_device_backup_events DROP COLUMN ssh_device_id_new');
        }
      });

      // ── adm_agents PK ────────────────────────────────────────────────────
      if (!isInt(agentsIdT)) {
        await step('Migrar adm_agents.id para INT AUTO_INCREMENT', async () => {
          if (!(await colExists(q, 'adm_agents', 'id_new'))) {
            await q('ALTER TABLE adm_agents ADD COLUMN id_new INT NOT NULL DEFAULT 0');
            await q('UPDATE adm_agents a INNER JOIN _bn_mig_agent_map m ON a.id = m.old_id SET a.id_new = m.new_id');
          }
          // Combina em único ALTER para que AUTO_INCREMENT tenha PK no mesmo passo
          await q('ALTER TABLE adm_agents DROP PRIMARY KEY, DROP COLUMN id, CHANGE COLUMN id_new id INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (id)');
          const [[mx]] = await q('SELECT IFNULL(MAX(id), 0) AS m FROM adm_agents');
          const next = Math.max(1, Number(mx.m) + 1);
          await q(`ALTER TABLE adm_agents AUTO_INCREMENT = ${next}`);
        });
      }

      // ── adm_ssh_devices PK ───────────────────────────────────────────────
      if (!isInt(devicesIdT)) {
        await step('Migrar adm_ssh_devices.id para INT AUTO_INCREMENT', async () => {
          if (!(await colExists(q, 'adm_ssh_devices', 'id_new'))) {
            await q('ALTER TABLE adm_ssh_devices ADD COLUMN id_new INT NOT NULL DEFAULT 0');
            await q('UPDATE adm_ssh_devices d INNER JOIN _bn_mig_device_map m ON d.id = m.old_id SET d.id_new = m.new_id');
          }
          await q('ALTER TABLE adm_ssh_devices DROP PRIMARY KEY, DROP COLUMN id, CHANGE COLUMN id_new id INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (id)');
          const [[mx]] = await q('SELECT IFNULL(MAX(id), 0) AS m FROM adm_ssh_devices');
          const next = Math.max(1, Number(mx.m) + 1);
          await q(`ALTER TABLE adm_ssh_devices AUTO_INCREMENT = ${next}`);
        });
      }

      // ── Limpa __bn_id_mig indexes órfãos ────────────────────────────────
      for (const tbl of ['adm_ssh_device_backups', 'adm_ssh_device_backup_events']) {
        if (await indexExists(q, tbl, '__bn_id_mig')) {
          await step(`Remover __bn_id_mig de ${tbl}`, () =>
            q(`ALTER TABLE \`${tbl}\` DROP INDEX \`__bn_id_mig\``),
          );
        }
      }

      // ── Adiciona FKs ─────────────────────────────────────────────────────
      const fkSpecs = [
        ['adm_ssh_devices', 'adm_ssh_devices_agent_fk',
          'FOREIGN KEY (agent_id) REFERENCES adm_agents(id) ON UPDATE CASCADE ON DELETE SET NULL'],
        ['adm_ssh_device_backups', 'adm_ssh_device_backups_device_fk',
          'FOREIGN KEY (ssh_device_id) REFERENCES adm_ssh_devices(id) ON UPDATE CASCADE ON DELETE CASCADE'],
        ['adm_ssh_device_backup_events', 'adm_ssh_device_backup_events_device_fk',
          'FOREIGN KEY (ssh_device_id) REFERENCES adm_ssh_devices(id) ON UPDATE CASCADE ON DELETE CASCADE'],
      ];
      for (const [tbl, cn, def] of fkSpecs) {
        if (!(await fkExists(q, tbl, cn))) {
          await step(`ADD FK ${cn}`, () => q(`ALTER TABLE \`${tbl}\` ADD CONSTRAINT \`${cn}\` ${def}`));
        }
      }

      // ── Limpeza ──────────────────────────────────────────────────────────
      await step('Limpeza das tabelas auxiliares', async () => {
        await q('DROP TABLE IF EXISTS _bn_mig_agent_map');
        await q('DROP TABLE IF EXISTS _bn_mig_device_map');
      });

      await q('SET FOREIGN_KEY_CHECKS=1');
      await t.commit();
    } catch (err) {
      console.error('ERRO na migração:', err.message);
      try { await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS=1'); } catch { /* ignora */ }
      await t.rollback();
      throw err;
    }
  },

  async down() {
    // Sem reversão segura: os dados foram remapeados para inteiros.
  },
};
