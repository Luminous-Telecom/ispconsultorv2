'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.removeIndex('ordens_servico', ['protocolo']);
    await queryInterface.addIndex('ordens_servico', ['protocolo'], {
      unique: true,
      name: 'ordens_servico_protocolo_unique',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('ordens_servico', 'ordens_servico_protocolo_unique');
    await queryInterface.addIndex('ordens_servico', ['protocolo']);
  },
};
