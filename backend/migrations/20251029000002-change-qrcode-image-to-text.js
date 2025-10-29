'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('titulos', 'qrcode_image', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('titulos', 'qrcode_image', {
      type: Sequelize.STRING(500),
      allowNull: true
    });
  }
};

