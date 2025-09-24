'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cache', {
      key: {
        type: Sequelize.STRING,
        primaryKey: true
      },
      value: {
        type: Sequelize.TEXT('medium'),
        allowNull: false
      },
      expiration: {
        type: Sequelize.INTEGER,
        allowNull: false
      }
    });

    await queryInterface.createTable('cache_locks', {
      key: {
        type: Sequelize.STRING,
        primaryKey: true
      },
      owner: {
        type: Sequelize.STRING,
        allowNull: false
      },
      expiration: {
        type: Sequelize.INTEGER,
        allowNull: false
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('cache_locks');
    await queryInterface.dropTable('cache');
  }
};