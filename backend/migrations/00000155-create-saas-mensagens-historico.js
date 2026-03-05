'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('saas_mensagens_historico', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
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
      tipo: {
        type: Sequelize.ENUM('email', 'whatsapp'),
        allowNull: false,
      },
      destinatario: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      titulo: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      mensagem: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('enviada', 'erro'),
        allowNull: false,
        defaultValue: 'enviada',
      },
      erro_mensagem: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      entidade_tipo: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      entidade_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      servidor_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      cliente_nome: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      cliente_email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      cliente_telefone: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('saas_mensagens_historico', ['empresa_id']);
    await queryInterface.addIndex('saas_mensagens_historico', ['tipo']);
    await queryInterface.addIndex('saas_mensagens_historico', ['status']);
    await queryInterface.addIndex('saas_mensagens_historico', ['entidade_tipo', 'entidade_id']);
    await queryInterface.addIndex('saas_mensagens_historico', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('saas_mensagens_historico');
  },
};
