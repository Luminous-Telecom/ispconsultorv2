'use strict';

/**
 * Adiciona manter_numeros_titulos e quantidade_titulos_manter em saas_parametros
 * Quando ativo, a geração de títulos mantém o número configurado (1-24) de títulos em aberto
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('saas_parametros', 'manter_numeros_titulos', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('saas_parametros', 'quantidade_titulos_manter', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 12,
    });
    await queryInterface.sequelize.query(
      "UPDATE saas_parametros SET manter_numeros_titulos = 0, quantidade_titulos_manter = 12 WHERE id = 1"
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('saas_parametros', 'quantidade_titulos_manter');
    await queryInterface.removeColumn('saas_parametros', 'manter_numeros_titulos');
  },
};
