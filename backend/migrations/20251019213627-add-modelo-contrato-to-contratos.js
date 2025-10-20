'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('contratos', 'modelo_contrato_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'documentos_sistema',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID do modelo de contrato a ser utilizado'
    });

    await queryInterface.addIndex('contratos', ['modelo_contrato_id'], {
      name: 'idx_contratos_modelo_contrato'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('contratos', 'idx_contratos_modelo_contrato');
    await queryInterface.removeColumn('contratos', 'modelo_contrato_id');
  }
};

