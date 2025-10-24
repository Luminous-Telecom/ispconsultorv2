'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Adicionar coluna modelo_termo_id
    await queryInterface.addColumn('termos_contrato', 'modelo_termo_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'modelos_termo',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Adicionar índice para modelo_termo_id
    await queryInterface.addIndex('termos_contrato', ['modelo_termo_id']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remover índice
    await queryInterface.removeIndex('termos_contrato', ['modelo_termo_id']);
    
    // Remover coluna
    await queryInterface.removeColumn('termos_contrato', 'modelo_termo_id');
  }
};
