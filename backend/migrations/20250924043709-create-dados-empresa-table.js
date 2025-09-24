'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('dados_empresa', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      
      // Dados básicos da empresa
      razao_social: {
        type: Sequelize.STRING,
        allowNull: false
      },
      nome_fantasia: {
        type: Sequelize.STRING,
        allowNull: true
      },
      cnpj: {
        type: Sequelize.STRING(18),
        allowNull: false,
        unique: true
      },
      inscricao_estadual: {
        type: Sequelize.STRING,
        allowNull: true
      },
      inscricao_municipal: {
        type: Sequelize.STRING,
        allowNull: true
      },
      
      // Endereço
      cep: {
        type: Sequelize.STRING(9),
        allowNull: false
      },
      endereco: {
        type: Sequelize.STRING,
        allowNull: false
      },
      numero: {
        type: Sequelize.STRING,
        allowNull: false
      },
      complemento: {
        type: Sequelize.STRING,
        allowNull: true
      },
      bairro: {
        type: Sequelize.STRING,
        allowNull: false
      },
      cidade: {
        type: Sequelize.STRING,
        allowNull: false
      },
      estado: {
        type: Sequelize.STRING(2),
        allowNull: false
      },
      
      // Contato
      telefone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      celular: {
        type: Sequelize.STRING,
        allowNull: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      site: {
        type: Sequelize.STRING,
        allowNull: true
      },
      
      // Responsável
      responsavel_nome: {
        type: Sequelize.STRING,
        allowNull: false
      },
      responsavel_cpf: {
        type: Sequelize.STRING(14),
        allowNull: false
      },
      responsavel_cargo: {
        type: Sequelize.STRING,
        allowNull: true
      },
      
      // Logo da empresa
      logo: {
        type: Sequelize.STRING,
        allowNull: true
      },
      
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('dados_empresa');
  }
};