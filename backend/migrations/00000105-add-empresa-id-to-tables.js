'use strict';

/**
 * Adiciona empresa_id em todas as tabelas principais apontando para dados_empresa.
 * Cada registro em dados_empresa é um tenant (empresa/loja) do sistema multi-tenant.
 */
const TABELAS_PRINCIPAIS = [
  'usuarios',
  'clientes',
  'contratos',
  'titulos',
  'planos',
  'bancos',
  'fornecedores',
  'contas_pagar',
  'notas_fiscais',
  'mensagens_historico',
  'servidores_email',
  'servidores_whatsapp',
  'parametros',
];

const TABELAS_COM_INDICE = [
  'clientes', 'contratos', 'titulos', 'planos', 'bancos', 'fornecedores', 'contas_pagar',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const tabela of TABELAS_PRINCIPAIS) {
      try {
        await queryInterface.addColumn(tabela, 'empresa_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null,
          references: { model: 'dados_empresa', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        });

        // Migrar dados existentes para a primeira empresa cadastrada
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
    for (const tabela of [...TABELAS_PRINCIPAIS].reverse()) {
      try {
        await queryInterface.removeColumn(tabela, 'empresa_id');
      } catch { /* ignora */ }
    }
  },
};
