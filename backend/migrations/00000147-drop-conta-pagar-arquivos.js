'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable('adm_conta_pagar_arquivos');
  },

  async down() {
    // Não recriar tabela não utilizada
  }
};
