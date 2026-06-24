'use strict';

const TABELAS = [
  'ordens_servico_filiais',
  'ordens_servico_setores',
  'ordens_servico_tecnicos',
  'ordens_servico_assuntos',
  'ordens_servico_estruturas',
];

module.exports = {
  up: async (queryInterface) => {
    for (const tableName of TABELAS) {
      await queryInterface.addConstraint(tableName, {
        fields: ['empresa_id'],
        type: 'foreign key',
        name: `${tableName}_empresa_id_fk`,
        references: {
          table: 'sistema_tenants',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    }
  },

  down: async (queryInterface) => {
    for (const tableName of TABELAS) {
      await queryInterface.removeConstraint(tableName, `${tableName}_empresa_id_fk`);
    }
  },
};
