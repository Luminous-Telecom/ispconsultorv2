/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('saas_usuarios_super', {
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
      senha_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      nivel_acesso: {
        type: Sequelize.ENUM('super', 'admin', 'suporte'),
        allowNull: false,
        defaultValue: 'admin',
      },
      precisa_trocar_senha: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      ultimo_login: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    const senhaHash = await bcrypt.hash('SuperAdmin@2025', 12);

    await queryInterface.bulkInsert('saas_usuarios_super', [
      {
        nome: 'Super Administrador',
        email: 'superadmin@sistema.com',
        senha_hash: senhaHash,
        nivel_acesso: 'super',
        precisa_trocar_senha: true,
        ativo: true,
        ultimo_login: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('saas_usuarios_super');
  },
};
