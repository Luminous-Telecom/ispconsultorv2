'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verificar se as colunas existem antes de tentar removê-las
    const tableDescription = await queryInterface.describeTable('termos_contrato');
    
    // Remover índices que dependem das colunas que serão removidas
    try {
      await queryInterface.removeIndex('termos_contrato', 'unique_contrato_tipo_termo');
    } catch (error) {
      // Índice pode não existir, continuar
    }
    
    try {
      await queryInterface.removeIndex('termos_contrato', ['tipo_termo']);
    } catch (error) {
      // Índice pode não existir, continuar
    }
    
    // Remover colunas apenas se existirem
    if (tableDescription.observacoes) {
      await queryInterface.removeColumn('termos_contrato', 'observacoes');
    }
    
    if (tableDescription.tipo_termo) {
      await queryInterface.removeColumn('termos_contrato', 'tipo_termo');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Adicionar as colunas de volta se necessário
    await queryInterface.addColumn('termos_contrato', 'observacoes', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    await queryInterface.addColumn('termos_contrato', 'tipo_termo', {
      type: Sequelize.ENUM('adesao', 'permanencia', 'cancelamento', 'alteracao'),
      allowNull: false
    });
    
    // Recriar índices
    await queryInterface.addIndex('termos_contrato', ['tipo_termo']);
    await queryInterface.addIndex('termos_contrato', ['contrato_id', 'tipo_termo'], {
      unique: true,
      name: 'unique_contrato_tipo_termo'
    });
  }
};
