'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mensagens_whatsapp', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      tipo: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Tipo da mensagem (10_dias_antes_vencimento, etc)'
      },
      tipo_envio: {
        type: Sequelize.ENUM('desativado', 'pdf'),
        allowNull: false,
        defaultValue: 'pdf'
      },
      mensagem_padrao: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci'
      },
      interacao1: {
        type: Sequelize.TEXT('long'),
        allowNull: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci'
      },
      interacao2: {
        type: Sequelize.TEXT('long'),
        allowNull: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci'
      },
      interacao3: {
        type: Sequelize.TEXT('long'),
        allowNull: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci'
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('mensagens_whatsapp');
  }
};

