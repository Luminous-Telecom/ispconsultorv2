'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('saas_contratos', 'desconto_percentual', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('saas_contratos', 'desconto_valor', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('saas_contratos', 'data_validade_desconto', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn('saas_contratos', 'isento_mensalidade', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('saas_contratos', 'desconto_percentual');
    await queryInterface.removeColumn('saas_contratos', 'desconto_valor');
    await queryInterface.removeColumn('saas_contratos', 'data_validade_desconto');
    await queryInterface.removeColumn('saas_contratos', 'isento_mensalidade');
  },
};
