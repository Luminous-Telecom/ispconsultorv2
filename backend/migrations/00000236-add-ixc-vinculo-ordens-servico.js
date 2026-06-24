'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ordens_servico', 'ixc_id', {
      type: Sequelize.STRING(32),
      allowNull: true,
    });
    await queryInterface.addColumn('ordens_servico', 'id_filial', {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: '',
    });
    await queryInterface.addColumn('ordens_servico', 'id_estrutura', {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: '0',
    });
    await queryInterface.addColumn('ordens_servico', 'id_assunto', {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: '',
    });
    await queryInterface.addColumn('ordens_servico', 'setor', {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: '',
    });
    await queryInterface.addColumn('ordens_servico', 'id_tecnico', {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: '',
    });
    await queryInterface.addColumn('ordens_servico', 'tipo', {
      type: Sequelize.STRING(4),
      allowNull: false,
      defaultValue: 'E',
    });

    await queryInterface.addIndex('ordens_servico', ['ixc_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('ordens_servico', ['ixc_id']);
    await queryInterface.removeColumn('ordens_servico', 'tipo');
    await queryInterface.removeColumn('ordens_servico', 'id_tecnico');
    await queryInterface.removeColumn('ordens_servico', 'setor');
    await queryInterface.removeColumn('ordens_servico', 'id_assunto');
    await queryInterface.removeColumn('ordens_servico', 'id_estrutura');
    await queryInterface.removeColumn('ordens_servico', 'id_filial');
    await queryInterface.removeColumn('ordens_servico', 'ixc_id');
  },
};
