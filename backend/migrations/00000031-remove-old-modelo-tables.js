'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remover tabelas antigas (já migradas para modelo_documento)
    await queryInterface.dropTable('modelo_contrato_permanencia');
    await queryInterface.dropTable('modelo_contrato_conteudo');
    await queryInterface.dropTable('modelo_termo_adesao');
    await queryInterface.dropTable('modelo_contrato');
    await queryInterface.dropTable('modelo_recibo');
    await queryInterface.dropTable('modelo_carta');
  },

  down: async (queryInterface, Sequelize) => {
    // Esta migration não pode ser revertida facilmente
    // pois os dados foram migrados para modelo_documento
    // Se necessário, seria preciso criar as tabelas novamente
    // e migrar os dados de volta (não recomendado)
    throw new Error('Migration cannot be reversed - data was migrated to modelo_documento');
  }
};

