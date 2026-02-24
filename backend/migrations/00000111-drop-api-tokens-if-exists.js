'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `api_tokens`');
  },

  down: async () => {
    // Não recria — tabela removida intencionalmente
  }
};
