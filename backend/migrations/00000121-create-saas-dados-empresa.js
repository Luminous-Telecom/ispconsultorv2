'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('saas_dados_empresa', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      nome_empresa: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      cnpj: {
        type: Sequelize.STRING(20),
        allowNull: true,
        unique: true,
      },
      email: {
        type: Sequelize.STRING(180),
        allowNull: false,
      },
      telefone: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      plano_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'saas_planos',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: Sequelize.ENUM('ativo', 'inativo', 'suspenso', 'cancelado', 'trial'),
        allowNull: false,
        defaultValue: 'trial',
      },
      data_cadastro: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      data_vencimento: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      limite_usuarios: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
      logo_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      dominio_customizado: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      observacoes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      razao_social: { type: Sequelize.STRING(255), allowNull: true },
      nome_fantasia: { type: Sequelize.STRING(255), allowNull: true },
      inscricao_estadual: { type: Sequelize.STRING(100), allowNull: true },
      inscricao_municipal: { type: Sequelize.STRING(100), allowNull: true },
      cep: { type: Sequelize.STRING(9), allowNull: true },
      endereco: { type: Sequelize.STRING(255), allowNull: true },
      numero: { type: Sequelize.STRING(20), allowNull: true },
      complemento: { type: Sequelize.STRING(100), allowNull: true },
      bairro: { type: Sequelize.STRING(100), allowNull: true },
      cidade: { type: Sequelize.STRING(100), allowNull: true },
      estado: { type: Sequelize.STRING(2), allowNull: true },
      celular: { type: Sequelize.STRING(20), allowNull: true },
      site: { type: Sequelize.STRING(255), allowNull: true },
      responsavel_nome: { type: Sequelize.STRING(200), allowNull: true },
      responsavel_cpf: { type: Sequelize.STRING(14), allowNull: true },
      responsavel_cargo: { type: Sequelize.STRING(100), allowNull: true },
      responsavel_assinatura: { type: Sequelize.STRING(500), allowNull: true },
      logo: { type: Sequelize.STRING(500), allowNull: true },
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

    await queryInterface.addIndex('saas_dados_empresa', ['status']);
    await queryInterface.addIndex('saas_dados_empresa', ['plano_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('saas_dados_empresa');
  },
};
