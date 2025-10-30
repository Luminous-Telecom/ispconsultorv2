'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Renomear coluna dia_vencimento para dia_vencimento_id
    await queryInterface.renameColumn('contratos', 'dia_vencimento', 'dia_vencimento_id');
    
    // Adicionar foreign key para dias_vencimento
    await queryInterface.addConstraint('contratos', {
      fields: ['dia_vencimento_id'],
      type: 'foreign key',
      name: 'fk_contratos_dia_vencimento',
      references: {
        table: 'dias_vencimento',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remover foreign key
    await queryInterface.removeConstraint('contratos', 'fk_contratos_dia_vencimento');
    
    // Renomear coluna de volta para dia_vencimento
    await queryInterface.renameColumn('contratos', 'dia_vencimento_id', 'dia_vencimento');
  }
};

