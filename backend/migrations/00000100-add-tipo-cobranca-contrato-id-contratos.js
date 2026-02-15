'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      'contratos',
      'tipo_cobranca_contrato_id',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tipos_cobranca_contrato',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('contratos', 'tipo_cobranca_contrato_id');
  }
};
