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
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      porta: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 65535,
        },
      },
      usuario: {
        type: Sequelize.STRING(255),
        allowNull: false,
        validate: {
          isEmail: true,
          notEmpty: true,
        },
      },
      senha: {
        type: Sequelize.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      ssl: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      tls: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      nome_remetente: {
        type: Sequelize.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      email_remetente: {
        type: Sequelize.STRING(255),
        allowNull: false,
        validate: {
          isEmail: true,
          notEmpty: true,
        },
      },
      timeout: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30000,
        validate: {
          min: 1000,
          max: 300000,
        },
      },
      tentativas: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
        validate: {
          min: 1,
          max: 10,
        },
      },
      intervalo_tentativas: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5000,
        validate: {
          min: 1000,
          max: 60000,
        },
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      }
    });

    // Adicionar índice para ativo
    await queryInterface.addIndex('servidores_email', ['ativo']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('servidores_email');
  }
};
