'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('dias_vencimento', 'dia', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

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
    await queryInterface.removeColumn('dias_vencimento', 'dia');
  }
};

