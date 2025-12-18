'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remover coluna api_url da tabela assinatura_digital_providers (se existir)
    try {
      await queryInterface.removeColumn('assinatura_digital_providers', 'api_url');
    } catch (error) {
      // Coluna pode não existir se a migration 00000048 ainda não foi executada
      // ou se já foi removida
    }

    // Remover colunas de assinatura digital da tabela parametros
    const columnsToRemove = [
      'assinatura_digital_habilitado',
      'assinatura_digital_api_provider',
      'assinatura_digital_api_key',
      'assinatura_digital_api_url',
      'assinatura_digital_account_id',
      'assinatura_digital_dias_expiracao_padrao'
    ];

    for (const column of columnsToRemove) {
      try {
        await queryInterface.removeColumn('parametros', column);
      } catch (error) {
        // Coluna pode não existir, ignorar erro
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Reverter: adicionar colunas de volta (apenas estrutura, sem dados)
    
    // Adicionar api_url de volta em assinatura_digital_providers
    try {
      await queryInterface.addColumn('assinatura_digital_providers', 'api_url', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'URL base da API (opcional, pode ser inferido do provider)'
      });
    } catch (error) {
      // Ignorar se já existe
    }

    // Adicionar colunas de volta em parametros
    try {
      await queryInterface.addColumn('parametros', 'assinatura_digital_habilitado', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    } catch (error) {
      // Ignorar se já existe
    }

    try {
      await queryInterface.addColumn('parametros', 'assinatura_digital_api_provider', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'assinafy'
      });
    } catch (error) {
      // Ignorar se já existe
    }

    try {
      await queryInterface.addColumn('parametros', 'assinatura_digital_api_key', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    } catch (error) {
      // Ignorar se já existe
    }

    try {
      await queryInterface.addColumn('parametros', 'assinatura_digital_api_url', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    } catch (error) {
      // Ignorar se já existe
    }

    try {
      await queryInterface.addColumn('parametros', 'assinatura_digital_account_id', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    } catch (error) {
      // Ignorar se já existe
    }

    try {
      await queryInterface.addColumn('parametros', 'assinatura_digital_dias_expiracao_padrao', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30
      });
    } catch (error) {
      // Ignorar se já existe
    }
  }
};

