'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Primeiro adicionar a coluna sem constraint
    await queryInterface.addColumn('carne_parcelas', 'plano_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 1
    });
    
    // Atualizar registros existentes
    await queryInterface.sequelize.query(
      'UPDATE carne_parcelas SET plano_id = 1 WHERE plano_id IS NULL'
    );
    
    // Agora tornar obrigatório
    await queryInterface.changeColumn('carne_parcelas', 'plano_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('carne_parcelas', 'plano_id');
  }
};
