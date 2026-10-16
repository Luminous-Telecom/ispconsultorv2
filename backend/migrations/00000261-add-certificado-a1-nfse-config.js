'use strict';

const COLUNAS = [
  ['certificado_pfx', { type: 'MEDIUMTEXT', allowNull: true }],
  ['certificado_senha', { type: 'STRING', length: 512, allowNull: true }],
  ['certificado_titular', { type: 'STRING', length: 255, allowNull: true }],
  ['certificado_cnpj', { type: 'STRING', length: 14, allowNull: true }],
  ['certificado_validade', { type: 'DATE', allowNull: true }],
  ['op_simples_nacional', { type: 'INTEGER', allowNull: false, defaultValue: 1 }],
  ['regime_especial_tributacao', { type: 'INTEGER', allowNull: false, defaultValue: 0 }],
  ['regime_apuracao_sn', { type: 'INTEGER', allowNull: true }],
  ['tp_ret_issqn', { type: 'INTEGER', allowNull: false, defaultValue: 1 }],
];

function colunaSequelize(Sequelize, definicao) {
  if (definicao.type === 'MEDIUMTEXT') return { type: Sequelize.TEXT('medium'), allowNull: definicao.allowNull };
  if (definicao.type === 'DATE') return { type: Sequelize.DATE, allowNull: definicao.allowNull };
  if (definicao.type === 'INTEGER') {
    return {
      type: Sequelize.INTEGER,
      allowNull: definicao.allowNull,
      defaultValue: definicao.defaultValue,
    };
  }
  return { type: Sequelize.STRING(definicao.length), allowNull: definicao.allowNull };
}

async function adicionar(queryInterface, Sequelize, tabela) {
  const descricao = await queryInterface.describeTable(tabela);
  for (const [nome, definicao] of COLUNAS) {
    if (!descricao[nome]) {
      await queryInterface.addColumn(tabela, nome, colunaSequelize(Sequelize, definicao));
    }
  }
}

async function remover(queryInterface, tabela) {
  const descricao = await queryInterface.describeTable(tabela);
  for (const [nome] of [...COLUNAS].reverse()) {
    if (descricao[nome]) {
      await queryInterface.removeColumn(tabela, nome);
    }
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await adicionar(queryInterface, Sequelize, 'nfse_config');
    await adicionar(queryInterface, Sequelize, 'saas_nfse_config');
  },

  async down(queryInterface) {
    await remover(queryInterface, 'saas_nfse_config');
    await remover(queryInterface, 'nfse_config');
  },
};
