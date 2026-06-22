'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('adm_ssh_manager_audit_logs', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      action: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      user_id: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      device_id: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      device_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      command: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      output: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      success: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      ip: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      duration: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('adm_ssh_manager_audit_logs', ['empresa_id', 'created_at'], {
      name: 'idx_ssh_audit_empresa_created',
    });
    await queryInterface.addIndex('adm_ssh_manager_audit_logs', ['device_id'], {
      name: 'idx_ssh_audit_device',
    });
    await queryInterface.addIndex('adm_ssh_manager_audit_logs', ['action'], {
      name: 'idx_ssh_audit_action',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('adm_ssh_manager_audit_logs');
  },
};
