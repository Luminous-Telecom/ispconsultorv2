'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('dias_vencimento', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      dia_padrao: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5,
        validate: {
          min: 1,
          max: 31,
        },
      },
      dias_tolerancia: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
        validate: {
          min: 0,
          max: 30,
        },
      },
      percentual_multa: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 2.00,
        validate: {
          min: 0,
          max: 100,
        },
      },
      juros_por_dia: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.33,
        validate: {
          min: 0,
          max: 10,
        },
      },
      vence_sabado: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      vence_domingo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      considera_feriados: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      feriados_fixos: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      feriados_moveis: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      }
    });

    // Adicionar índice para ativo
    await queryInterface.addIndex('dias_vencimento', ['ativo']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('dias_vencimento');
  }
};
