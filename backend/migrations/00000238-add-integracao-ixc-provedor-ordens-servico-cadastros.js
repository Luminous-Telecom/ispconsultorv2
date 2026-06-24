'use strict';

const TABELAS = [
  'ordens_servico_filiais',
  'ordens_servico_setores',
  'ordens_servico_tecnicos',
  'ordens_servico_assuntos',
  'ordens_servico_estruturas',
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const tableName of TABELAS) {
      await queryInterface.addColumn(tableName, 'integracao_ixc_provedor_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'integracao_ixc_provedor',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });

      await queryInterface.removeIndex(tableName, `${tableName}_empresa_ixc_id`);

      await queryInterface.addIndex(tableName, ['integracao_ixc_provedor_id']);
      await queryInterface.addIndex(tableName, ['integracao_ixc_provedor_id', 'ixc_id'], {
        unique: true,
        name: `${tableName}_integracao_ixc_id`,
      });
    }
  },

  down: async (queryInterface) => {
    for (const tableName of TABELAS) {
      await queryInterface.removeIndex(tableName, `${tableName}_integracao_ixc_id`);
      await queryInterface.removeIndex(tableName, ['integracao_ixc_provedor_id']);
      await queryInterface.removeColumn(tableName, 'integracao_ixc_provedor_id');
      await queryInterface.addIndex(tableName, ['empresa_id', 'ixc_id'], {
        unique: true,
        name: `${tableName}_empresa_ixc_id`,
      });
    }
  },
};
