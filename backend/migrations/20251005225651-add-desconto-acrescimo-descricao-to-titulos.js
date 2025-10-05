'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('titulos', 'desconto_percentual', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    });

    await queryInterface.addColumn('titulos', 'desconto_valor', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    });

    await queryInterface.addColumn('titulos', 'acrescimo_percentual', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    });

    await queryInterface.addColumn('titulos', 'acrescimo_valor', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    });

    await queryInterface.addColumn('titulos', 'valor_final', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Valor final após aplicar desconto/acréscimo'
    });

    await queryInterface.addColumn('titulos', 'descricao', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Descrição do título'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('titulos', 'desconto_percentual');
    await queryInterface.removeColumn('titulos', 'desconto_valor');
    await queryInterface.removeColumn('titulos', 'acrescimo_percentual');
    await queryInterface.removeColumn('titulos', 'acrescimo_valor');
    await queryInterface.removeColumn('titulos', 'valor_final');
    await queryInterface.removeColumn('titulos', 'descricao');
  }
};