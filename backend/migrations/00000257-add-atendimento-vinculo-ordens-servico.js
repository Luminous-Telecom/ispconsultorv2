'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ordens_servico', 'atendimento_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'atendimentos',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('ordens_servico', 'atendimento_ixc_id', {
      type: Sequelize.STRING(32),
      allowNull: true,
    });

    await queryInterface.addColumn('ordens_servico', 'integracao_ixc_provedor_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'integracao_ixc_provedor',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('ordens_servico', ['atendimento_id']);
    await queryInterface.addIndex('ordens_servico', ['atendimento_ixc_id']);
    await queryInterface.addIndex('ordens_servico', ['integracao_ixc_provedor_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('ordens_servico', ['integracao_ixc_provedor_id']);
    await queryInterface.removeIndex('ordens_servico', ['atendimento_ixc_id']);
    await queryInterface.removeIndex('ordens_servico', ['atendimento_id']);
    await queryInterface.removeColumn('ordens_servico', 'integracao_ixc_provedor_id');
    await queryInterface.removeColumn('ordens_servico', 'atendimento_ixc_id');
    await queryInterface.removeColumn('ordens_servico', 'atendimento_id');
  },
};
