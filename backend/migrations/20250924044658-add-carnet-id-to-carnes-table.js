'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('carnes');
    
    if (!tableDescription.carnet_id) {
      await queryInterface.addColumn('carnes', 'carnet_id', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('carnes');
    
    if (tableDescription.carnet_id) {
      await queryInterface.removeColumn('carnes', 'carnet_id');
    }
  }
};