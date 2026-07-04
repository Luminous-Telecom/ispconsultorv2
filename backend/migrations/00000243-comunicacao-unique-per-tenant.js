'use strict';

/**
 * Isolamento multi-tenant na comunicação:
 * - Remove índice global "só um servidor ativo no banco" → cada tenant pode ter o seu
 * - Mensagens e templates únicos por (empresa_id, tipo) / (empresa_id, nome, idioma)
 */
const TABELAS_SERVIDOR = [
  'comunicacao_servidores_email',
  'comunicacao_servidores_whatsapp',
];

const TABELAS_MENSAGEM = [
  'comunicacao_mensagens_email',
  'comunicacao_mensagens_whatsapp',
];

const TEMPLATE_TABLE = 'comunicacao_templates_whatsapp';

async function removeIndexIfExists(queryInterface, table, indexName) {
  try {
    await queryInterface.removeIndex(table, indexName);
  } catch (_e) {
    /* ignora */
  }
}

async function dropUniqueIndexesOnColumns(queryInterface, table, columns) {
  const [rows] = await queryInterface.sequelize.query(
    `
    SELECT DISTINCT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols, NON_UNIQUE
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
    GROUP BY INDEX_NAME, NON_UNIQUE
    `,
    { replacements: [table] }
  );

  for (const row of rows || []) {
    if (Number(row.NON_UNIQUE) !== 0) continue;
    if (row.INDEX_NAME === 'PRIMARY') continue;
    const cols = String(row.cols || '').split(',');
    const exact = cols.length === columns.length && columns.every((c) => cols.includes(c));
    if (exact) {
      await removeIndexIfExists(queryInterface, table, row.INDEX_NAME);
    }
  }
}

async function dedupeActiveServers(queryInterface, table) {
  await queryInterface.sequelize.query(`
    UPDATE \`${table}\` s
    INNER JOIN (
      SELECT empresa_id, MIN(id) AS keep_id
      FROM \`${table}\`
      WHERE ativo = 1 AND empresa_id IS NOT NULL
      GROUP BY empresa_id
    ) k ON s.empresa_id = k.empresa_id
    SET s.ativo = 0
    WHERE s.ativo = 1 AND s.id <> k.keep_id
  `);

  await queryInterface.sequelize.query(`
    UPDATE \`${table}\`
    SET ativo = 0
    WHERE ativo = 1 AND empresa_id IS NULL
  `);
}

async function backfillEmpresaId(queryInterface, table) {
  await queryInterface.sequelize.query(`
    UPDATE \`${table}\`
    SET empresa_id = (SELECT MIN(id) FROM dados_empresa)
    WHERE empresa_id IS NULL
      AND EXISTS (SELECT 1 FROM dados_empresa LIMIT 1)
  `);
}

async function dedupeMensagensPorEmpresaTipo(queryInterface, table) {
  await queryInterface.sequelize.query(`
    DELETE t1 FROM \`${table}\` t1
    INNER JOIN \`${table}\` t2
      ON t1.tipo = t2.tipo
      AND t1.empresa_id <=> t2.empresa_id
      AND t1.id > t2.id
  `);
}

async function dedupeTemplatesPorEmpresa(queryInterface) {
  await queryInterface.sequelize.query(`
    DELETE t1 FROM \`${TEMPLATE_TABLE}\` t1
    INNER JOIN \`${TEMPLATE_TABLE}\` t2
      ON t1.nome = t2.nome
      AND t1.idioma = t2.idioma
      AND t1.empresa_id <=> t2.empresa_id
      AND t1.id > t2.id
  `);
}

module.exports = {
  async up(queryInterface) {
    for (const table of TABELAS_SERVIDOR) {
      try {
        await dedupeActiveServers(queryInterface, table);
        await dropUniqueIndexesOnColumns(queryInterface, table, ['ativo']);
        await queryInterface.addIndex(table, ['empresa_id'], {
          name: `${table}_empresa_id`,
        }).catch(() => {});
        await queryInterface.addIndex(table, ['empresa_id', 'ativo'], {
          name: `${table}_empresa_id_ativo`,
        }).catch(() => {});
      } catch (err) {
        const msg = err.message || '';
        if (!msg.includes("doesn't exist") && !msg.includes('Unknown table')) throw err;
      }
    }

    for (const table of TABELAS_MENSAGEM) {
      try {
        await backfillEmpresaId(queryInterface, table);
        await dropUniqueIndexesOnColumns(queryInterface, table, ['tipo']);
        await dedupeMensagensPorEmpresaTipo(queryInterface, table);
        await queryInterface.addIndex(table, ['empresa_id', 'tipo'], {
          unique: true,
          name: `${table}_empresa_tipo_unique`,
        });
        await queryInterface.addIndex(table, ['empresa_id'], {
          name: `${table}_empresa_id`,
        }).catch(() => {});
      } catch (err) {
        const msg = err.message || '';
        if (!msg.includes("doesn't exist") && !msg.includes('Unknown table')) throw err;
      }
    }

    try {
      await backfillEmpresaId(queryInterface, TEMPLATE_TABLE);
      await removeIndexIfExists(queryInterface, TEMPLATE_TABLE, 'templates_whatsapp_nome_idioma_unique');
      await removeIndexIfExists(queryInterface, TEMPLATE_TABLE, 'templates_whatsapp_nome_idioma');
      await dropUniqueIndexesOnColumns(queryInterface, TEMPLATE_TABLE, ['nome', 'idioma']);
      await dedupeTemplatesPorEmpresa(queryInterface);
      await queryInterface.addIndex(TEMPLATE_TABLE, ['empresa_id', 'nome', 'idioma'], {
        unique: true,
        name: `${TEMPLATE_TABLE}_empresa_nome_idioma_unique`,
      });
    } catch (err) {
      const msg = err.message || '';
      if (!msg.includes("doesn't exist") && !msg.includes('Unknown table')) throw err;
    }
  },

  async down(queryInterface) {
    for (const table of TABELAS_SERVIDOR) {
      try {
        await removeIndexIfExists(queryInterface, table, `${table}_empresa_id_ativo`);
        await removeIndexIfExists(queryInterface, table, `${table}_empresa_id`);
      } catch (_e) {
        /* ignora */
      }
    }

    for (const table of TABELAS_MENSAGEM) {
      try {
        await removeIndexIfExists(queryInterface, table, `${table}_empresa_tipo_unique`);
        await removeIndexIfExists(queryInterface, table, `${table}_empresa_id`);
        await queryInterface.addIndex(table, ['tipo'], {
          unique: true,
          name: `${table}_tipo`,
        }).catch(() => {});
      } catch (_e) {
        /* ignora */
      }
    }

    try {
      await removeIndexIfExists(queryInterface, TEMPLATE_TABLE, `${TEMPLATE_TABLE}_empresa_nome_idioma_unique`);
      await queryInterface.addIndex(TEMPLATE_TABLE, ['nome', 'idioma'], {
        unique: true,
        name: 'templates_whatsapp_nome_idioma_unique',
      }).catch(() => {});
    } catch (_e) {
      /* ignora */
    }
  },
};
