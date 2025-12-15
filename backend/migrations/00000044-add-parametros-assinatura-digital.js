'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Adicionar colunas de assinatura digital na tabela parametros
    await queryInterface.addColumn('parametros', 'assinatura_digital_habilitado', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn('parametros', 'assinatura_digital_api_provider', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'assinafy'
    });

    await queryInterface.addColumn('parametros', 'assinatura_digital_api_key', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('parametros', 'assinatura_digital_api_url', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: 'https://api.assinafy.com.br/v1'
    });

    await queryInterface.addColumn('parametros', 'assinatura_digital_dias_expiracao_padrao', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 30
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remover colunas de assinatura digital
    await queryInterface.removeColumn('parametros', 'assinatura_digital_habilitado');
    await queryInterface.removeColumn('parametros', 'assinatura_digital_api_provider');
    await queryInterface.removeColumn('parametros', 'assinatura_digital_api_key');
    await queryInterface.removeColumn('parametros', 'assinatura_digital_api_url');
    await queryInterface.removeColumn('parametros', 'assinatura_digital_dias_expiracao_padrao');
  }
};
