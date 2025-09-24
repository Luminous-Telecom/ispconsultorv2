'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar se a tabela carnes existe
    const tableDescription = await queryInterface.describeTable('carnes');
    
    // Adicionar campo plano_id se não existir
    if (!tableDescription.plano_id) {
      await queryInterface.addColumn('carnes', 'plano_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'planos',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('carnes');
    
    if (tableDescription.plano_id) {
      await queryInterface.removeColumn('carnes', 'plano_id');
    }
  }
};