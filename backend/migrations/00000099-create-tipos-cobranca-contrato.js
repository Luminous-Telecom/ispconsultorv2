'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tipos_cobranca_contrato', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nome: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      quantidade_titulos: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Quantidade de boletos/títulos a manter (ex: 12, 3)'
      },
      periodicidade: {
        type: Sequelize.ENUM('mensal', 'bimestral', 'trimestral', 'semestral', 'anual', 'quinzenal', 'semanal'),
        allowNull: false,
        defaultValue: 'mensal',
        comment: 'Período entre cada cobrança'
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('tipos_cobranca_contrato');
  }
};
