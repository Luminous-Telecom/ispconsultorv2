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
 */

const TBL = 'adm_ssh_device_backup_events';

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

    if (!(await tableExists(q, TBL))) {
      await queryInterface.createTable(TBL, {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        ssh_device_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        empresa_id: {
          type: Sequelize.INTEGER,
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
      });
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
