'use strict';

/**
 * Centraliza histórico de mensagens SaaS em adm_comunicacao_mensagens_historico.
 */

const TABELA_UNIFICADA = 'adm_comunicacao_mensagens_historico';

/** Tabelas de histórico SaaS substituídas por adm_comunicacao_mensagens_historico (historico_origem = saas). */
const TABELAS_HISTORICO_SAAS_REMOVER = [
  'saas_saas_mensagens_historico',
  'saas_mensagens_historico',
];

async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    { replacements: [tableName] }
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function columnExists(queryInterface, tableName, columnName) {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
    { replacements: [tableName, columnName] }
  );
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const q = queryInterface.sequelize;

    if (!(await tableExists(queryInterface, TABELA_UNIFICADA))) {
      return;
    }

    if (!(await columnExists(queryInterface, TABELA_UNIFICADA, 'historico_origem'))) {
      await queryInterface.addColumn(TABELA_UNIFICADA, 'historico_origem', {
        type: Sequelize.ENUM('erp', 'saas'),
        allowNull: false,
        defaultValue: 'erp',
        comment: 'Origem do registro: erp (tenant) ou saas (operador SaaS)',
      });
    }

    await q.query(`
      UPDATE ${TABELA_UNIFICADA}
      SET historico_origem = 'erp'
      WHERE historico_origem IS NULL OR historico_origem = ''
    `);

    for (const tabelaSaas of TABELAS_HISTORICO_SAAS_REMOVER) {
        if (!(await tableExists(queryInterface, tabelaSaas))) {
          continue;
        }

        await q.query(`
          INSERT INTO ${TABELA_UNIFICADA} (
            empresa_id,
            tipo,
            destinatario,
            titulo,
            mensagem,
            status,
            erro_mensagem,
            entidade_tipo,
            entidade_id,
            servidor_id,
            cliente_nome,
            cliente_email,
            cliente_telefone,
            historico_origem,
            created_at,
            updated_at
          )
          SELECT
            empresa_id,
            tipo,
            destinatario,
            titulo,
            mensagem,
            status,
            erro_mensagem,
            entidade_tipo,
            entidade_id,
            servidor_id,
            cliente_nome,
            cliente_email,
            cliente_telefone,
            'saas',
            created_at,
            updated_at
          FROM ${tabelaSaas} s
          WHERE NOT EXISTS (
            SELECT 1
            FROM ${TABELA_UNIFICADA} u
            WHERE u.historico_origem = 'saas'
              AND u.empresa_id = s.empresa_id
              AND u.tipo = s.tipo
              AND u.destinatario = s.destinatario
              AND u.created_at = s.created_at
          )
        `);
    }

    for (const tableName of TABELAS_HISTORICO_SAAS_REMOVER) {
      if (await tableExists(queryInterface, tableName)) {
        await queryInterface.dropTable(tableName);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const q = queryInterface.sequelize;
    const tabelaSaas = 'saas_saas_mensagens_historico';

    if (!(await tableExists(queryInterface, tabelaSaas))) {
      await queryInterface.createTable(tabelaSaas, {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        empresa_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        tipo: {
          type: Sequelize.ENUM('email', 'whatsapp'),
          allowNull: false,
        },
        destinatario: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        titulo: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        mensagem: {
          type: Sequelize.TEXT('long'),
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM('enviada', 'erro'),
          allowNull: false,
          defaultValue: 'enviada',
        },
        erro_mensagem: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        entidade_tipo: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        entidade_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        servidor_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        cliente_nome: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        cliente_email: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        cliente_telefone: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      });
    }

    if (await columnExists(queryInterface, TABELA_UNIFICADA, 'historico_origem')) {
      await q.query(`
        INSERT INTO ${tabelaSaas} (
          empresa_id,
          tipo,
          destinatario,
          titulo,
          mensagem,
          status,
          erro_mensagem,
          entidade_tipo,
          entidade_id,
          servidor_id,
          cliente_nome,
          cliente_email,
          cliente_telefone,
          created_at,
          updated_at
        )
        SELECT
          empresa_id,
          tipo,
          destinatario,
          titulo,
          mensagem,
          status,
          erro_mensagem,
          entidade_tipo,
          entidade_id,
          servidor_id,
          cliente_nome,
          cliente_email,
          cliente_telefone,
          created_at,
          updated_at
        FROM ${TABELA_UNIFICADA}
        WHERE historico_origem = 'saas'
      `);

      await q.query(`DELETE FROM ${TABELA_UNIFICADA} WHERE historico_origem = 'saas'`);

      await queryInterface.removeColumn(TABELA_UNIFICADA, 'historico_origem');
    }
  },
};
