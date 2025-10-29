'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remover a constraint de chave estrangeira incorreta
    await queryInterface.removeConstraint(
      'contratos',
      'contratos_modelo_contrato_id_foreign_idx'
    );

    // Adicionar a constraint correta
    await queryInterface.addConstraint('contratos', {
      fields: ['modelo_contrato_id'],
      type: 'foreign key',
      name: 'contratos_modelo_contrato_id_foreign_idx',
      references: {
        table: 'modelo_contrato',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remover a constraint correta
    await queryInterface.removeConstraint(
      'contratos',
      'contratos_modelo_contrato_id_foreign_idx'
    );

    // Restaurar a constraint incorreta (original)
    await queryInterface.addConstraint('contratos', {
      fields: ['modelo_contrato_id'],
      type: 'foreign key',
      name: 'contratos_modelo_contrato_id_foreign_idx',
      references: {
        table: 'documentos_sistema',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  }
};

