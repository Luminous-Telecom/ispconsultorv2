'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remover colunas de desconto
    await queryInterface.removeColumn('planos', 'desconto_percentual');
    await queryInterface.removeColumn('planos', 'desconto_valor');
    await queryInterface.removeColumn('planos', 'desconto_ativo');
  },

  down: async (queryInterface, Sequelize) => {
    // Recriar as colunas de desconto
    await queryInterface.addColumn('planos', 'desconto_percentual', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Desconto percentual aplicado no plano'
    });

    await queryInterface.addColumn('planos', 'desconto_valor', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Desconto em valor aplicado no plano'
    });

    await queryInterface.addColumn('planos', 'desconto_ativo', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indica se o desconto está ativo'
    });
  }
};

