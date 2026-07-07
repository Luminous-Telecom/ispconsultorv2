'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('saas_planos', 'mostrar_hotsite', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('saas_planos', 'desconto_percentual', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('saas_planos', 'desconto_percentual');
    await queryInterface.removeColumn('saas_planos', 'mostrar_hotsite');
  },
};
