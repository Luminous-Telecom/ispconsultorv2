'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ordens_servico_mensagens', 'usuario_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addIndex('ordens_servico_mensagens', ['usuario_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('ordens_servico_mensagens', ['usuario_id']);
    await queryInterface.removeColumn('ordens_servico_mensagens', 'usuario_id');
  },
};
