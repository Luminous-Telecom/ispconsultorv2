'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('parametros', 'assinatura_digital_account_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Workspace Account ID da Assinafy (obtido no painel "My Account > Workspaces")'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('parametros', 'assinatura_digital_account_id');
  }
};
