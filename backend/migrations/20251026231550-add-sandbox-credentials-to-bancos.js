'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('bancos', 'client_id_sandbox', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('bancos', 'client_secret_sandbox', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('bancos', 'client_id_sandbox');
    await queryInterface.removeColumn('bancos', 'client_secret_sandbox');
  }
};
