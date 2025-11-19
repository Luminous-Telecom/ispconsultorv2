'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('parametros', 'titulos_vence_domingo', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'titulos_vence_sabado'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('parametros', 'titulos_vence_domingo');
  }
};

