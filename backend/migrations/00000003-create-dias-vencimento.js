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
      dia: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      dia_padrao: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('dias_vencimento', ['ativo']);

    // Inserir dias padrão
    const todosDias = Array.from({ length: 30 }, (_, i) => i + 1).map(dia => ({
      dia: dia,
      dia_padrao: dia,
      ativo: [5, 10, 15, 20, 25, 30].includes(dia),
      created_at: new Date(),
      updated_at: new Date()
    }));

    await queryInterface.bulkInsert('dias_vencimento', todosDias);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('dias_vencimento');
  }
};

