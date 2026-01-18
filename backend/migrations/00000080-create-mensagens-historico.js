'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mensagens_historico', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      tipo: {
        type: Sequelize.ENUM('email', 'whatsapp'),
        allowNull: false
      },
      destinatario: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Email ou telefone do destinatário'
      },
      titulo: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Assunto do email ou null para WhatsApp'
      },
      mensagem: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
        comment: 'Conteúdo da mensagem'
      },
      status: {
        type: Sequelize.ENUM('enviada', 'erro'),
        allowNull: false,
        defaultValue: 'enviada'
      },
      erro_mensagem: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Mensagem de erro se status for erro'
      },
      entidade_tipo: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Tipo da entidade relacionada (titulo, cliente, etc)'
      },
      entidade_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ID da entidade relacionada'
      },
      servidor_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ID do servidor usado para envio'
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Índices para performance
    await queryInterface.addIndex('mensagens_historico', ['tipo']);
    await queryInterface.addIndex('mensagens_historico', ['status']);
    await queryInterface.addIndex('mensagens_historico', ['entidade_tipo', 'entidade_id']);
    await queryInterface.addIndex('mensagens_historico', ['usuario_id']);
    await queryInterface.addIndex('mensagens_historico', ['created_at']);
    await queryInterface.addIndex('mensagens_historico', ['tipo', 'status']);
    await queryInterface.addIndex('mensagens_historico', ['tipo', 'created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('mensagens_historico');
  }
};