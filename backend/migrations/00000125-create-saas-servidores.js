'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('saas_servidores_whatsapp', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'saas_dados_empresa',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      nome: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      url_api: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      token: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      numero: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('ativo', 'inativo', 'erro'),
        allowNull: false,
        defaultValue: 'ativo',
      },
      limite_mensagens: {
        type: Sequelize.INTEGER,
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

    await queryInterface.createTable('saas_servidores_email', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'saas_dados_empresa',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      nome: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      host_smtp: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      porta: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 587,
      },
      usuario: {
        type: Sequelize.STRING(180),
        allowNull: false,
      },
      senha_criptografada: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      ssl: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      status: {
        type: Sequelize.ENUM('ativo', 'inativo', 'erro'),
        allowNull: false,
        defaultValue: 'ativo',
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

    await queryInterface.addIndex('saas_servidores_whatsapp', ['empresa_id']);
    await queryInterface.addIndex('saas_servidores_email', ['empresa_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('saas_servidores_email');
    await queryInterface.dropTable('saas_servidores_whatsapp');
  },
};
