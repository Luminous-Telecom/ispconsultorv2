/* eslint-disable @typescript-eslint/no-var-requires */
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuarios', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      nome: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(180),
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      role: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'admin',
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      precisa_trocar_senha: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      ultimo_login: {
        type: Sequelize.DATE,
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

    // Senha padrão para o usuário administrador inicial
    const senhaPadrao = 'admin123';
    
    // Gera o hash da senha
    const passwordHash = await bcrypt.hash(senhaPadrao, 10);

    // Insere o usuário administrador padrão
    await queryInterface.bulkInsert('usuarios', [
      {
        nome: 'Administrador ISP Consultor',
        email: 'admin@ispconsultor.com.br',
        password_hash: passwordHash,
        role: 'admin',
        ativo: true,
        precisa_trocar_senha: true,
        ultimo_login: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('usuarios');
  },
};