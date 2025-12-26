'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('titulos', 'is_avulso', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indica se o título foi criado manualmente (avulso) ou gerado automaticamente pelo sistema'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('titulos', 'is_avulso');
  }
};

