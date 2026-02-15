'use strict';

module.exports = {
  up: async (queryInterface) => {
    try {
      await queryInterface.removeColumn('parametros', 'total_titulos_financeiro');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes("Can't DROP") && !errorMessage.includes("Unknown column")) {
        throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('parametros', 'total_titulos_financeiro', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 12
    });
  }
};
