'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('titulos', 'qrcode_image', {
      type: Sequelize.TEXT('long'),
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('titulos', 'qrcode_image', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  }
};
