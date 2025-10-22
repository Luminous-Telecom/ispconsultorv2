'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Renomear tabelas para os nomes corretos
    await queryInterface.renameTable('conteudo_modelo_contrato', 'modelo_contrato_conteudo');
    await queryInterface.renameTable('conteudo_termo_adesao', 'modelo_termo_adesao');
    await queryInterface.renameTable('conteudo_contrato_permanencia', 'modelo_contrato_permanencia');

    // Renomear coluna 'conteudo' para 'modelo' em todas as tabelas
    await queryInterface.renameColumn('modelo_contrato_conteudo', 'conteudo', 'modelo');
    await queryInterface.renameColumn('modelo_termo_adesao', 'conteudo', 'modelo');
    await queryInterface.renameColumn('modelo_contrato_permanencia', 'conteudo', 'modelo');
  },

  async down(queryInterface, Sequelize) {
    // Reverter renomeação das colunas
    await queryInterface.renameColumn('modelo_contrato_conteudo', 'modelo', 'conteudo');
    await queryInterface.renameColumn('modelo_termo_adesao', 'modelo', 'conteudo');
    await queryInterface.renameColumn('modelo_contrato_permanencia', 'modelo', 'conteudo');

    // Reverter renomeação das tabelas
    await queryInterface.renameTable('modelo_contrato_conteudo', 'conteudo_modelo_contrato');
    await queryInterface.renameTable('modelo_termo_adesao', 'conteudo_termo_adesao');
    await queryInterface.renameTable('modelo_contrato_permanencia', 'conteudo_contrato_permanencia');
  }
};
