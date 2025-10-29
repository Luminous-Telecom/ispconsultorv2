'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('contratos', 'modelo_contrato_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'modelo_contrato',
        key: 'id'
      },
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('contratos', 'modelo_contrato_id');
  }
};

