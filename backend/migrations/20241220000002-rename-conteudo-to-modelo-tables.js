'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Renomear tabelas de conteudo para modelo
    await queryInterface.renameTable('conteudo_modelo_contrato', 'modelo_contrato_conteudo');
    await queryInterface.renameTable('conteudo_termo_adesao', 'modelo_termo_adesao');
    await queryInterface.renameTable('conteudo_contrato_permanencia', 'modelo_contrato_permanencia');
  },

  async down(queryInterface, Sequelize) {
    // Reverter renomeação
    await queryInterface.renameTable('modelo_contrato_conteudo', 'conteudo_modelo_contrato');
    await queryInterface.renameTable('modelo_termo_adesao', 'conteudo_termo_adesao');
    await queryInterface.renameTable('modelo_contrato_permanencia', 'conteudo_contrato_permanencia');
  }
};
