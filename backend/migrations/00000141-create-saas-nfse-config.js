'use strict';

/**
 * Tabela saas_nfse_config - NFS-e isolada para SaaS
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('saas_nfse_config', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      codigo_servico_municipal: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      aliquota_iss: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      descricao_servico: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      serie_nf: {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: '80000'
      },
      numero_dps: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1
      },
      portal_nacional_username: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      portal_nacional_password: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      portal_nacional_base_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
        defaultValue: 'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional'
      },
      portal_nacional_ambiente: {
        type: Sequelize.ENUM('HOMOLOGACAO', 'PRODUCAO'),
        allowNull: false,
        defaultValue: 'HOMOLOGACAO'
      },
      asaas_api_key: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      asaas_sandbox: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      provider: {
        type: Sequelize.ENUM('PORTAL_NACIONAL', 'ASAAS'),
        allowNull: false,
        defaultValue: 'PORTAL_NACIONAL'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('saas_nfse_config');
  }
};
