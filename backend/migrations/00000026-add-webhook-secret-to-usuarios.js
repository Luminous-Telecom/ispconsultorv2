'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('usuarios', 'webhook_secret', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'ultimo_login'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('usuarios', 'webhook_secret');
  },
};

