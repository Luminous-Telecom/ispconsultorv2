'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Remover constraint existente
    await queryInterface.removeConstraint('carne_parcelas', 'carne_parcelas_carne_id_foreign');
    
    // Adicionar nova constraint com ON DELETE CASCADE
    await queryInterface.addConstraint('carne_parcelas', {
      fields: ['carne_id'],
      type: 'foreign key',
      name: 'carne_parcelas_carne_id_foreign',
      references: {
        table: 'carnes',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remover constraint com CASCADE
    await queryInterface.removeConstraint('carne_parcelas', 'carne_parcelas_carne_id_foreign');
    
    // Restaurar constraint original sem ON DELETE
    await queryInterface.addConstraint('carne_parcelas', {
      fields: ['carne_id'],
      type: 'foreign key',
      name: 'carne_parcelas_carne_id_foreign',
      references: {
        table: 'carnes',
        field: 'id'
      },
      onUpdate: 'CASCADE'
    });
  }
};
