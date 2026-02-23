'use strict';

/**
 * Adiciona empresa_id nas tabelas que ainda não possuem o campo,
 * completando o isolamento multi-tenant.
 */
const TABELAS = [
  'tipos_cobranca_contrato',
  'termos_contrato',
  'scheduled_routines',
  'routine_execution_logs',
  'nfse_config',
  'modelo_documento',
  'mensagens_whatsapp',
  'mensagens_email',
  'dias_vencimento',
  'contrato_planos_adicionais',
  'cliente_arquivos',
  'auditoria',
  'assinaturas_digital',
  'assinatura_digital_providers',
];

const TABELAS_COM_INDICE = [
  'tipos_cobranca_contrato',
  'modelo_documento',
  'scheduled_routines',
  'assinaturas_digital',
  'auditoria',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const tabela of TABELAS) {
      try {
        await queryInterface.addColumn(tabela, 'empresa_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null,
          references: { model: 'dados_empresa', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        });

        await queryInterface.sequelize.query(
          `UPDATE \`${tabela}\` SET empresa_id = (SELECT MIN(id) FROM dados_empresa) WHERE empresa_id IS NULL`
        );
      } catch (err) {
        const msg = err.message || '';
        const ignorar = msg.includes('already exists') || msg.includes('Duplicate column') ||
          msg.includes("doesn't exist") || msg.includes('Unknown table');
        if (!ignorar) throw err;
      }
    }

    for (const tabela of TABELAS_COM_INDICE) {
      try {
        await queryInterface.addIndex(tabela, ['empresa_id'], {
          name: `idx_${tabela}_empresa_id`,
        });
      } catch { /* ignora se já existir */ }
    }
  },

  async down(queryInterface) {
    for (const tabela of [...TABELAS].reverse()) {
      try {
        await queryInterface.removeColumn(tabela, 'empresa_id');
      } catch { /* ignora */ }
    }
  },
};
