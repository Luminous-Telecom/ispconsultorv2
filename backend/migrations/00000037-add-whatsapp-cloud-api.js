'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Adicionar coluna tipo_api
    await queryInterface.addColumn('servidores_whatsapp', 'tipo_api', {
      type: Sequelize.ENUM('evolution', 'whatsapp_cloud'),
      allowNull: false,
      defaultValue: 'evolution',
      comment: 'Tipo de API: evolution ou whatsapp_cloud'
    });

    // Adicionar coluna whatsapp_cloud_token
    await queryInterface.addColumn('servidores_whatsapp', 'whatsapp_cloud_token', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Token de acesso da API oficial do WhatsApp (WhatsApp Cloud API)'
    });

    // Adicionar coluna whatsapp_cloud_phone_number_id
    await queryInterface.addColumn('servidores_whatsapp', 'whatsapp_cloud_phone_number_id', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'ID do número de telefone na API oficial do WhatsApp'
    });

    // Adicionar coluna whatsapp_cloud_business_account_id
    await queryInterface.addColumn('servidores_whatsapp', 'whatsapp_cloud_business_account_id', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'ID da conta de negócios do WhatsApp'
    });

    // Adicionar coluna template_mapping (JSON para mapear tipos de mensagem para templates)
    await queryInterface.addColumn('servidores_whatsapp', 'template_mapping', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON com mapeamento de tipos de mensagem para templates do Facebook'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('servidores_whatsapp', 'template_mapping');
    await queryInterface.removeColumn('servidores_whatsapp', 'whatsapp_cloud_business_account_id');
    await queryInterface.removeColumn('servidores_whatsapp', 'whatsapp_cloud_phone_number_id');
    await queryInterface.removeColumn('servidores_whatsapp', 'whatsapp_cloud_token');
    await queryInterface.removeColumn('servidores_whatsapp', 'tipo_api');
    
    // Remover ENUM
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_servidores_whatsapp_tipo_api";');
  }
};

