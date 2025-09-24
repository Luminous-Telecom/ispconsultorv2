'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('jobs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      queue: {
        type: Sequelize.STRING,
        allowNull: false
      },
      payload: {
        type: Sequelize.TEXT('long'),
        allowNull: false
      },
      attempts: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false
      },
      reserved_at: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      available_at: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false
      },
      created_at: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false
      }
    });

    await queryInterface.createTable('job_batches', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      total_jobs: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      pending_jobs: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      failed_jobs: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      failed_job_ids: {
        type: Sequelize.TEXT('long'),
        allowNull: false
      },
      options: {
        type: Sequelize.TEXT('medium'),
        allowNull: true
      },
      cancelled_at: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      created_at: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      finished_at: {
        type: Sequelize.INTEGER,
        allowNull: true
      }
    });

    await queryInterface.createTable('failed_jobs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      uuid: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      connection: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      queue: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      payload: {
        type: Sequelize.TEXT('long'),
        allowNull: false
      },
      exception: {
        type: Sequelize.TEXT('long'),
        allowNull: false
      },
      failed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Índices
    await queryInterface.addIndex('jobs', ['queue']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('failed_jobs');
    await queryInterface.dropTable('job_batches');
    await queryInterface.dropTable('jobs');
  }
};