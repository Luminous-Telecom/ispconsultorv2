'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remover índice único que impede múltiplos contratos para o mesmo cliente e plano
    await queryInterface.removeIndex('contratos', 'contratos_cliente_plano_unique');
    
    // Adicionar índice não único para melhor performance nas consultas
    await queryInterface.addIndex('contratos', ['cliente_id', 'plano_id'], {
      name: 'contratos_cliente_plano_index',
      unique: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Reverter: remover índice não único
    await queryInterface.removeIndex('contratos', 'contratos_cliente_plano_index');
    
    // Reverter: adicionar índice único novamente
    await queryInterface.addIndex('contratos', ['cliente_id', 'plano_id'], {
      unique: true,
      name: 'contratos_cliente_plano_unique'
    });
  }
};

