'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Alterar charset da tabela para utf8mb4
    await queryInterface.sequelize.query(
      "ALTER TABLE `mensagens_whatsapp` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    );
  },

  async down(queryInterface, Sequelize) {
    // Rollback: alterar para utf8
    await queryInterface.sequelize.query(
      "ALTER TABLE `mensagens_whatsapp` CONVERT TO CHARACTER SET utf8 COLLATE utf8_general_ci;"
    );
  }
};

