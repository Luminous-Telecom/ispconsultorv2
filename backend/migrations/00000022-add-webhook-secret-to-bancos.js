'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('bancos', 'webhook_secret', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'url_retorno'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('bancos', 'webhook_secret');
  }
};

