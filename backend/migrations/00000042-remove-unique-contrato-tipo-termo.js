'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remover a constraint UNIQUE que impede múltiplos termos do mesmo tipo
    try {
      await queryInterface.removeIndex('termos_contrato', 'unique_contrato_tipo_termo');
    } catch (error) {
      // Se o índice não existir, não é um problema
      console.log('Índice unique_contrato_tipo_termo não encontrado ou já removido');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Recriar a constraint UNIQUE (caso precise reverter)
    await queryInterface.addIndex('termos_contrato', ['contrato_id', 'tipo_termo'], {
      unique: true,
      name: 'unique_contrato_tipo_termo'
    });
  }
};

