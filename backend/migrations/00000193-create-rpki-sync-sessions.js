'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rpki_sync_sessions', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'adm_sistema_dados_empresa', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      host: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      port: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 3323,
      },
      status: {
        type: Sequelize.ENUM('idle', 'running', 'success', 'failed'),
        allowNull: false,
        defaultValue: 'idle',
      },
      last_sync: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      serial_number: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('rpki_sync_sessions', ['empresa_id'], { name: 'rpki_sync_sessions_empresa_id' });
    await queryInterface.addIndex('rpki_sync_sessions', ['status'], { name: 'rpki_sync_sessions_status' });
    await queryInterface.addIndex('rpki_sync_sessions', ['last_sync'], { name: 'rpki_sync_sessions_last_sync' });
    await queryInterface.addIndex('rpki_sync_sessions', ['empresa_id', 'status'], { name: 'rpki_sync_sessions_empresa_status' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rpki_sync_sessions');
  },
};
