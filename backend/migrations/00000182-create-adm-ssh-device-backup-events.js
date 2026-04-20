'use strict';

/**
 * Histórico de execuções de backup por equipamento (métricas do dashboard, sem depender de logs ES).
 *
 * FKs são adicionadas com addConstraint após createTable (sem `references` inline),
 * para evitar errno 150 "Foreign key constraint is incorrectly formed" em alguns
 * ambientes MariaDB/MySQL com Sequelize ao embutir várias FKs no mesmo CREATE TABLE.
 *
 * up() é idempotente: tolera migração interrompida antes de gravar SequelizeMeta (errno 1061
 * em índices já existentes) e não duplica o backfill se a tabela já tiver linhas.
 *
 * ssh_device_id e empresa_id usam o mesmo tipo que adm_ssh_devices.id e adm_dados_empresa.id
 * (ex.: CHAR(36) antes da 00000185), evitando errno 150 na criação das FKs.
 *
 * Se a tabela já existir com tipos errados (tentativa anterior com INTEGER) mas estiver vazia,
 * ela é descartada e recriada automaticamente; com dados, a migration falha para revisão manual.
 *
 * Para FK em colunas string (ex.: UUID char(36)), charset/collation da nova tabela devem coincidir
 * com a coluna referenciada; caso contrário o MySQL retorna errno 150. O Sequelize não repassa
 * charset por coluna no CREATE TABLE do dialeto MySQL, então usamos DEFAULT CHARSET/COLLATE na tabela.
 */

const TBL = 'adm_ssh_device_backup_events';

async function columnCharsetCollation(q, table, column) {
  const [rows] = await q(
    'SELECT CHARACTER_SET_NAME AS cs, COLLATION_NAME AS coll FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column LIMIT 1',
    { replacements: { table, column } },
  );
  const r = rows?.[0];
  const cs = r?.cs != null && String(r.cs).trim() !== '' ? String(r.cs) : null;
  const coll = r?.coll != null && String(r.coll).trim() !== '' ? String(r.coll) : null;
  return { charset: cs, collation: coll };
}

async function columnMysqlType(q, table, column) {
  const [rows] = await q(
    'SELECT COLUMN_TYPE AS ct FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column LIMIT 1',
    { replacements: { table, column } },
  );
  const ct = rows?.[0]?.ct;
  return ct != null ? String(ct) : null;
}

/**
 * @param {import('sequelize').Sequelize} Sequelize
 * @param {string} columnType valor de INFORMATION_SCHEMA.COLUMNS.COLUMN_TYPE
 */
function dataTypeForInformationSchema(Sequelize, columnType) {
  if (columnType == null || String(columnType).trim() === '') {
    throw new Error('00000182: COLUMN_TYPE vazio ao mapear tipo de coluna para FK.');
  }
  const raw = String(columnType).trim();
  const unsigned = /\bunsigned\b/i.test(raw);
  const base = raw
    .replace(/\bunsigned\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (/^bigint/i.test(base)) {
    const t = Sequelize.BIGINT;
    return unsigned ? t.UNSIGNED : t;
  }
  if (/^mediumint/i.test(base)) {
    const t = Sequelize.MEDIUMINT;
    return unsigned ? t.UNSIGNED : t;
  }
  if (/^smallint/i.test(base)) {
    const t = Sequelize.SMALLINT;
    return unsigned ? t.UNSIGNED : t;
  }
  if (/^tinyint/i.test(base)) {
    const t = Sequelize.TINYINT;
    return unsigned ? t.UNSIGNED : t;
  }
  if (/^int/i.test(base)) {
    const t = Sequelize.INTEGER;
    return unsigned ? t.UNSIGNED : t;
  }

  const charM = base.match(/^char\((\d+)\)/i);
  if (charM) {
    return Sequelize.CHAR(parseInt(charM[1], 10));
  }
  const varcharM = base.match(/^varchar\((\d+)\)/i);
  if (varcharM) {
    return Sequelize.STRING(parseInt(varcharM[1], 10));
  }

  throw new Error(
    `00000182: tipo INFORMATION_SCHEMA não suportado nesta migration: "${columnType}". Ajuste o schema ou estenda o mapeamento.`,
  );
}

function normColumnType(ct) {
  return String(ct)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function isStringLikeMysqlType(columnType) {
  const base = String(columnType)
    .trim()
    .toLowerCase()
    .replace(/\bunsigned\b/gi, '')
    .trim();
  return /^char\(|^varchar\(/.test(base);
}

function stringCollationMismatch(parentCC, tableCC) {
  const p = parentCC.collation;
  const c = tableCC.collation;
  if (p == null && c == null) return false;
  if (p == null || c == null) return true;
  return normColumnType(p) !== normColumnType(c);
}

async function tableExists(q, table) {
  const [rows] = await q(
    'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table LIMIT 1',
    { replacements: { table } },
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function indexExists(q, table, indexName) {
  const [rows] = await q(
    'SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND INDEX_NAME = :idx GROUP BY INDEX_NAME LIMIT 1',
    { replacements: { table, idx: indexName } },
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function fkExists(q, table, constraintName) {
  const [rows] = await q(
    'SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND CONSTRAINT_NAME = :cn AND CONSTRAINT_TYPE = "FOREIGN KEY" LIMIT 1',
    { replacements: { table, cn: constraintName } },
  );
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const s = queryInterface.sequelize;
    const q = (sql, opts = {}) => s.query(sql, opts);

    const deviceIdCt = await columnMysqlType(q, 'adm_ssh_devices', 'id');
    const empresaIdCt = await columnMysqlType(q, 'adm_dados_empresa', 'id');
    if (!deviceIdCt || !empresaIdCt) {
      throw new Error(
        '00000182: não foi possível ler adm_ssh_devices.id ou adm_dados_empresa.id. Confirme migrations 00000144 e 00000170 (ou equivalentes).',
      );
    }
    const sshDeviceIdType = dataTypeForInformationSchema(Sequelize, deviceIdCt);
    const empresaIdType = dataTypeForInformationSchema(Sequelize, empresaIdCt);

    const devCC = await columnCharsetCollation(q, 'adm_ssh_devices', 'id');
    const empCC = await columnCharsetCollation(q, 'adm_dados_empresa', 'id');
    /** @type {{ engine: string, charset?: string, collate?: string }} */
    const createTableOpts = { engine: 'InnoDB' };
    if (devCC.charset && devCC.collation) {
      createTableOpts.charset = devCC.charset;
      createTableOpts.collate = devCC.collation;
    } else if (empCC.charset && empCC.collation) {
      createTableOpts.charset = empCC.charset;
      createTableOpts.collate = empCC.collation;
    }

    if (await tableExists(q, TBL)) {
      const existingSsh = await columnMysqlType(q, TBL, 'ssh_device_id');
      const existingEmp = await columnMysqlType(q, TBL, 'empresa_id');
      let sshMismatch =
        existingSsh != null && normColumnType(existingSsh) !== normColumnType(deviceIdCt);
      let empMismatch =
        existingEmp != null && normColumnType(existingEmp) !== normColumnType(empresaIdCt);
      if (!sshMismatch && existingSsh != null && isStringLikeMysqlType(deviceIdCt)) {
        const evSshCC = await columnCharsetCollation(q, TBL, 'ssh_device_id');
        if (stringCollationMismatch(devCC, evSshCC)) {
          sshMismatch = true;
        }
      }
      if (!empMismatch && existingEmp != null && isStringLikeMysqlType(empresaIdCt)) {
        const evEmpCC = await columnCharsetCollation(q, TBL, 'empresa_id');
        if (stringCollationMismatch(empCC, evEmpCC)) {
          empMismatch = true;
        }
      }
      if (sshMismatch || empMismatch) {
        const [badTypeRows] = await q(`SELECT COUNT(*) AS c FROM \`${TBL}\``);
        const badRows = Number(badTypeRows?.[0]?.c ?? 0);
        if (badRows > 0) {
          const partes = [];
          if (sshMismatch) {
            partes.push(`ssh_device_id (${existingSsh} vs esperado ${deviceIdCt})`);
          }
          if (empMismatch) {
            partes.push(`empresa_id (${existingEmp} vs esperado ${empresaIdCt})`);
          }
          throw new Error(
            `00000182: ${TBL} tem ${badRows} linha(s) e tipos incompatíveis: ${partes.join('; ')}. Faça backup, ajuste os dados ou DROP TABLE ${TBL} e rode db:migrate.`,
          );
        }
        await queryInterface.dropTable(TBL);
      }
    }

    if (!(await tableExists(q, TBL))) {
      await queryInterface.createTable(
        TBL,
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          ssh_device_id: {
            type: sshDeviceIdType,
            allowNull: false,
          },
          empresa_id: {
            type: empresaIdType,
            allowNull: true,
          },
          status: {
            type: Sequelize.STRING(32),
            allowNull: false,
            comment:
              'falha | sucesso | somente_local | falha_envio | verificado (extensível; hoje o runner grava falha/sucesso)',
          },
          detail: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
        },
        createTableOpts,
      );
    }

    // Não chamar addIndex em ssh_device_id aqui: addConstraint da FK cria o índice
    // `adm_ssh_device_backup_events_ssh_device_id` e um segundo addIndex gera errno 1061
    // (Duplicate key name) em produção.
    const idxEmpresaCreated = `${TBL}_empresa_id_created_at`;
    const idxCreated = `${TBL}_created_at`;
    const idxStatusCreated = `${TBL}_status_created_at`;

    if (!(await indexExists(q, TBL, idxEmpresaCreated))) {
      await queryInterface.addIndex(TBL, ['empresa_id', 'created_at'], { name: idxEmpresaCreated });
    }
    if (!(await indexExists(q, TBL, idxCreated))) {
      await queryInterface.addIndex(TBL, ['created_at'], { name: idxCreated });
    }
    if (!(await indexExists(q, TBL, idxStatusCreated))) {
      await queryInterface.addIndex(TBL, ['status', 'created_at'], { name: idxStatusCreated });
    }

    if (!(await fkExists(q, TBL, 'adm_ssh_device_backup_events_device_fk'))) {
      await queryInterface.addConstraint(TBL, {
        fields: ['ssh_device_id'],
        type: 'foreign key',
        name: 'adm_ssh_device_backup_events_device_fk',
        references: { table: 'adm_ssh_devices', field: 'id' },
        onUpdate: 'cascade',
        onDelete: 'cascade',
      });
    }

    if (!(await fkExists(q, TBL, 'adm_ssh_device_backup_events_empresa_fk'))) {
      await queryInterface.addConstraint(TBL, {
        fields: ['empresa_id'],
        type: 'foreign key',
        name: 'adm_ssh_device_backup_events_empresa_fk',
        references: { table: 'adm_dados_empresa', field: 'id' },
        onUpdate: 'cascade',
        onDelete: 'set null',
      });
    }

    const [countRows] = await q(`SELECT COUNT(*) AS c FROM \`${TBL}\``);
    const n = Number(countRows?.[0]?.c ?? 0);
    if (n === 0) {
      await q(`
      INSERT INTO \`${TBL}\` (ssh_device_id, empresa_id, status, detail, created_at)
      SELECT b.ssh_device_id, d.empresa_id, 'sucesso', NULL, b.created_at
      FROM adm_ssh_device_backups b
      INNER JOIN adm_ssh_devices d ON d.id = b.ssh_device_id
    `);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable(TBL);
  },
};
