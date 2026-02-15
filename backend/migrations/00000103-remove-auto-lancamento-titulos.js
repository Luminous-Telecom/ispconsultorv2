'use strict';

module.exports = {
  up: async (queryInterface) => {
    try {
      await queryInterface.removeColumn('parametros', 'auto_lancamento_titulos');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes("Can't DROP") && !errorMessage.includes("Unknown column")) {
        throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('parametros', 'auto_lancamento_titulos', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  }
};
