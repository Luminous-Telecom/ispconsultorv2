'use strict';

/**
 * Cria adm_agents e adm_ssh_devices no padrão adm_* do ERP.
 * Inclui empresa_id para isolamento multi-tenant.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('adm_agents', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'adm_dados_empresa', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      token_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
        comment: 'SHA-256 hex do token de autenticação',
      },
      token_hint: {
        type: Sequelize.STRING(12),
        allowNull: true,
        comment: 'Primeiros 8 caracteres do token para exibição',
      },
      description: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      last_seen_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      version: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      hostname: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      os_info: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('adm_agents', ['empresa_id']);
    await queryInterface.addIndex('adm_agents', ['is_active']);
    await queryInterface.addIndex('adm_agents', ['token_hash']);

    await queryInterface.createTable('adm_ssh_devices', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'adm_dados_empresa', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      agent_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'adm_agents', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      host: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      port: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 22,
      },
      username: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      password: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'Criptografado com AES-256-CBC',
      },
      private_key: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Chave privada PEM criptografada com AES-256-CBC',
      },
      /** cisco/huawei reservados na UI (em breve); default operacional é mikrotik. */
      device_type: {
        type: Sequelize.ENUM('mikrotik', 'cisco', 'huawei'),
        allowNull: false,
        defaultValue: 'mikrotik',
      },
      description: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('adm_ssh_devices', ['empresa_id']);
    await queryInterface.addIndex('adm_ssh_devices', ['agent_id']);
    await queryInterface.addIndex('adm_ssh_devices', ['is_active']);
    await queryInterface.addIndex('adm_ssh_devices', ['device_type']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('adm_ssh_devices');
    await queryInterface.dropTable('adm_agents');
  },
};
