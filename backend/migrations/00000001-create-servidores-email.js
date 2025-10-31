'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('servidores_email', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      host: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      porta: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      usuario: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      senha: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      ssl: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      tls: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      nome_remetente: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      email_remetente: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      timeout: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30000
      },
      tentativas: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3
      },
      intervalo_tentativas: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5000
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

    await queryInterface.addIndex('servidores_email', ['ativo']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('servidores_email');
  }
};

