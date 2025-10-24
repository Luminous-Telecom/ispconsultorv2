'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Adicionar foreign key constraint
    await queryInterface.addConstraint('termos_contrato', {
      fields: ['contrato_id'],
      type: 'foreign key',
      name: 'fk_termos_contrato_id',
      references: {
        table: 'contratos',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('termos_contrato', 'fk_termos_contrato_id');
  }
};
