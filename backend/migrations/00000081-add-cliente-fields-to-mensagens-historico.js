'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('mensagens_historico', 'cliente_nome', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Nome do cliente destinatário'
    });

    await queryInterface.addColumn('mensagens_historico', 'cliente_email', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Email do cliente destinatário'
    });

    await queryInterface.addColumn('mensagens_historico', 'cliente_telefone', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Telefone do cliente destinatário'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('mensagens_historico', 'cliente_nome');
    await queryInterface.removeColumn('mensagens_historico', 'cliente_email');
    await queryInterface.removeColumn('mensagens_historico', 'cliente_telefone');
  }
};