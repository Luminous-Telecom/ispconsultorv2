'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('clientes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      cnpj: {
        type: Sequelize.STRING(18),
        allowNull: false,
        unique: true
      },
      razao_social: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      nome_fantasia: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      telefone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      whatsapp: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      cep: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      endereco: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      numero: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      complemento: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      bairro: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      cidade: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      estado: {
        type: Sequelize.STRING(2),
        allowNull: true
      },
      observacoes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      tipo_cobranca: {
        type: Sequelize.ENUM('titulo', 'carne'),
        allowNull: false,
        defaultValue: 'titulo'
      },
      valor_primeiro_titulo: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'total'
      },
      recebe_email: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      recebe_sms: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      recebe_whatsapp: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

    await queryInterface.addIndex('clientes', ['cnpj'], { unique: true });
    await queryInterface.addIndex('clientes', ['ativo']);
    await queryInterface.addIndex('clientes', ['cidade']);
    await queryInterface.addIndex('clientes', ['estado']);
    await queryInterface.addIndex('clientes', ['razao_social']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('clientes');
  }
};

