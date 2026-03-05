'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable('adm_fornecedor_historicos');
    await queryInterface.dropTable('adm_fornecedor_arquivos');
    await queryInterface.dropTable('adm_fornecedor_contatos');
  },

  async down() {
    // Não recriar tabelas não utilizadas
  }
};
