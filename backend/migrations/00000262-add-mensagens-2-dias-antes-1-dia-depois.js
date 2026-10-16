'use strict';

/**
 * Copia o texto já configurado de 5 dias (ou 10 / mesmo dia) para os tipos novos,
 * por empresa. Quem ainda não tem a origem continua podendo criar o tipo na tela.
 */

const WHATSAPP = 'comunicacao_mensagens_whatsapp';
const EMAIL = 'comunicacao_mensagens_email';

const COLUNAS_WHATSAPP = [
  'tipo_envio',
  'mensagem_padrao',
  'mensagem_manual',
  'interacao1',
  'interacao2',
  'interacao3',
  'template_id',
  'ativo',
];

const COLUNAS_EMAIL = ['tipo_envio', 'mensagem_padrao', 'mensagem_manual', 'ativo'];

async function copiarTipo(queryInterface, table, colunas, origem, destino) {
  const selecionadas = colunas.map((coluna) => `src.\`${coluna}\``).join(', ');
  await queryInterface.sequelize.query(
    `
    INSERT INTO \`${table}\` (empresa_id, tipo, ${colunas.map((coluna) => `\`${coluna}\``).join(', ')}, created_at, updated_at)
    SELECT src.empresa_id, :destino, ${selecionadas}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM \`${table}\` src
    WHERE src.tipo = :origem
      AND NOT EXISTS (
        SELECT 1 FROM \`${table}\` dst
        WHERE dst.tipo = :destino
          AND dst.empresa_id <=> src.empresa_id
      )
    `,
    { replacements: { origem, destino } }
  );
}

async function incluirDiaNaRotina(queryInterface, campo, dia) {
  await queryInterface.sequelize.query(
    `
    UPDATE sistema_scheduled_routines
    SET configuracao = JSON_ARRAY_APPEND(configuracao, :caminho, :dia)
    WHERE tipo = 'envio_boletos'
      AND JSON_CONTAINS_PATH(configuracao, 'one', :caminho)
      AND NOT JSON_CONTAINS(configuracao, :diaJson, :caminho)
    `,
    {
      replacements: {
        caminho: `$.${campo}`,
        dia,
        diaJson: JSON.stringify(dia),
      },
    }
  );
}

module.exports = {
  async up(queryInterface) {
    await copiarTipo(queryInterface, WHATSAPP, COLUNAS_WHATSAPP, '05_dias_antes_vencimento', '02_dias_antes_vencimento');
    await copiarTipo(queryInterface, WHATSAPP, COLUNAS_WHATSAPP, '10_dias_antes_vencimento', '02_dias_antes_vencimento');
    await copiarTipo(queryInterface, WHATSAPP, COLUNAS_WHATSAPP, '05_dias_depois_vencimento', '01_dias_depois_vencimento');
    await copiarTipo(queryInterface, WHATSAPP, COLUNAS_WHATSAPP, 'mesmo_dia_vencimento', '01_dias_depois_vencimento');

    await copiarTipo(queryInterface, EMAIL, COLUNAS_EMAIL, '05_dias_antes_vencimento', '02_dias_antes_vencimento');
    await copiarTipo(queryInterface, EMAIL, COLUNAS_EMAIL, '10_dias_antes_vencimento', '02_dias_antes_vencimento');
    await copiarTipo(queryInterface, EMAIL, COLUNAS_EMAIL, '05_dias_depois_vencimento', '01_dias_depois_vencimento');
    await copiarTipo(queryInterface, EMAIL, COLUNAS_EMAIL, 'mesmo_dia_vencimento', '01_dias_depois_vencimento');

    await incluirDiaNaRotina(queryInterface, 'antesVencimento', 2);
    await incluirDiaNaRotina(queryInterface, 'depoisVencimento', 1);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM \`${WHATSAPP}\`
      WHERE tipo IN ('02_dias_antes_vencimento', '01_dias_depois_vencimento')
    `);
    await queryInterface.sequelize.query(`
      DELETE FROM \`${EMAIL}\`
      WHERE tipo IN ('02_dias_antes_vencimento', '01_dias_depois_vencimento')
    `);

    const [rows] = await queryInterface.sequelize.query(`
      SELECT id, configuracao
      FROM sistema_scheduled_routines
      WHERE tipo = 'envio_boletos'
    `);
    for (const row of rows || []) {
      const config = typeof row.configuracao === 'string' ? JSON.parse(row.configuracao) : row.configuracao;
      if (!config || typeof config !== 'object') continue;
      let changed = false;
      if (Array.isArray(config.antesVencimento)) {
        const next = config.antesVencimento.filter((dia) => Number(dia) !== 2);
        if (next.length !== config.antesVencimento.length) {
          config.antesVencimento = next;
          changed = true;
        }
      }
      if (Array.isArray(config.depoisVencimento)) {
        const next = config.depoisVencimento.filter((dia) => Number(dia) !== 1);
        if (next.length !== config.depoisVencimento.length) {
          config.depoisVencimento = next;
          changed = true;
        }
      }
      if (!changed) continue;
      await queryInterface.sequelize.query(
        'UPDATE sistema_scheduled_routines SET configuracao = :config WHERE id = :id',
        { replacements: { config: JSON.stringify(config), id: row.id } }
      );
    }
  },
};
