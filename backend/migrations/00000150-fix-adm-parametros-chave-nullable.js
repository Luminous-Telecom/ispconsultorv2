'use strict';

/**
 * adm_parametros tem linhas de dois tipos:
 * 1) Config (validar_cpf_cnpj, etc) - chave deve ser NULL
 * 2) Key-value (central_assinante_metodo_login, etc) - chave preenchida
 * Garante que chave aceite NULL para permitir o registro de config.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('adm_parametros');
    if (tableInfo.chave && tableInfo.chave.allowNull === false) {
      await queryInterface.changeColumn('adm_parametros', 'chave', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Reverter não é seguro se já existem rows com chave NULL
    const tableInfo = await queryInterface.describeTable('adm_parametros');
    if (tableInfo.chave && tableInfo.chave.allowNull === true) {
      await queryInterface.changeColumn('adm_parametros', 'chave', {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'config'
      });
    }
  }
};
