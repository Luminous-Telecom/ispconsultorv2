'use strict';

const TABELAS = [
  'blockdomi_log_acesso',
  'conta_pagar_arquivos',
  'conta_pagar_pagamentos',
  'dominios',
  'fornecedor_arquivos',
  'fornecedor_contatos',
  'fornecedor_historicos',
  'hotsites',
  'ips_permitidos_blockdomi',
  'ipv4',
  'ipv6',
  'operacoes_blockdomi',
  'versoes_blockdomi',
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
  },

  async down(queryInterface) {
    for (const tabela of [...TABELAS].reverse()) {
      try {
        await queryInterface.removeColumn(tabela, 'empresa_id');
      } catch { /* ignora */ }
    }
  },
};
