'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verificar quais colunas já existem na tabela parametros
    const tableDescription = await queryInterface.describeTable('parametros');

    // Adicionar coluna chave se não existir
    if (!tableDescription.chave) {
      await queryInterface.addColumn('parametros', 'chave', {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true,
        comment: 'Chave única do parâmetro (para estrutura chave-valor)'
      });
      console.log('Coluna "chave" adicionada à tabela parametros');
    }

    // Adicionar coluna valor se não existir
    if (!tableDescription.valor) {
      await queryInterface.addColumn('parametros', 'valor', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Valor do parâmetro'
      });
      console.log('Coluna "valor" adicionada à tabela parametros');
    }

    // Adicionar coluna tipo se não existir
    if (!tableDescription.tipo) {
      await queryInterface.addColumn('parametros', 'tipo', {
        type: Sequelize.ENUM('string', 'number', 'boolean', 'json'),
        allowNull: false,
        defaultValue: 'string',
        comment: 'Tipo do valor do parâmetro'
      });
      console.log('Coluna "tipo" adicionada à tabela parametros');
    }

    // Adicionar coluna descricao se não existir
    if (!tableDescription.descricao) {
      await queryInterface.addColumn('parametros', 'descricao', {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
        comment: 'Descrição do parâmetro'
      });
      console.log('Coluna "descricao" adicionada à tabela parametros');
    }

    // Adicionar coluna categoria se não existir
    if (!tableDescription.categoria) {
      await queryInterface.addColumn('parametros', 'categoria', {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'geral',
        comment: 'Categoria do parâmetro'
      });
      console.log('Coluna "categoria" adicionada à tabela parametros');
    }

    // Adicionar coluna ativo se não existir
    if (!tableDescription.ativo) {
      await queryInterface.addColumn('parametros', 'ativo', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Se o parâmetro está ativo'
      });
      console.log('Coluna "ativo" adicionada à tabela parametros');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Não remover as colunas no down, pois elas são necessárias para o funcionamento do sistema
    // Apenas deixar como está para evitar quebrar dados existentes
    console.log('Mantendo colunas chave-valor na tabela parametros para compatibilidade');
  }
};