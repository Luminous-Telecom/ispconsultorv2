'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('assinaturas_digital', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      termo_contrato_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'termos_contrato',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      cliente_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'clientes',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      documento_tipo: {
        type: Sequelize.ENUM('termo', 'contrato', 'outro'),
        allowNull: false,
        defaultValue: 'termo'
      },
      documento_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      api_provider: {
        type: Sequelize.ENUM('assinafy', 'zapsign', 'govbr', 'outro'),
        allowNull: false,
        defaultValue: 'assinafy'
      },
      api_document_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      api_signature_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pendente', 'enviado', 'assinado', 'cancelado', 'expirado', 'erro'),
        allowNull: false,
        defaultValue: 'pendente'
      },
      url_assinatura: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      email_assinante: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      nome_assinante: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      cpf_cnpj_assinante: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      data_envio: {
        type: Sequelize.DATE,
        allowNull: true
      },
      data_assinatura: {
        type: Sequelize.DATE,
        allowNull: true
      },
      data_expiracao: {
        type: Sequelize.DATE,
        allowNull: true
      },
      pdf_assinado_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      pdf_assinado_base64: {
        type: Sequelize.TEXT('long'),
        allowNull: true
      },
      metadata: {
        type: Sequelize.TEXT('long'),
        allowNull: true
      },
      erro_mensagem: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('assinaturas_digital', ['termo_contrato_id']);
    await queryInterface.addIndex('assinaturas_digital', ['cliente_id']);
    await queryInterface.addIndex('assinaturas_digital', ['status']);
    await queryInterface.addIndex('assinaturas_digital', ['api_document_id']);
    await queryInterface.addIndex('assinaturas_digital', ['api_signature_id']);
    await queryInterface.addIndex('assinaturas_digital', ['email_assinante']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('assinaturas_digital');
  }
};
