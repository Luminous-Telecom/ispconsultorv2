'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rpki_sync_logs', {
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
      ca_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'rpki_cas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      type: {
        type: Sequelize.ENUM('provisioning', 'publication'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('success', 'failed'),
        allowNull: false,
      },
      remote_host: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('rpki_sync_logs', ['empresa_id'], { name: 'rpki_sync_logs_empresa_id' });
    await queryInterface.addIndex('rpki_sync_logs', ['ca_id'], { name: 'rpki_sync_logs_ca_id' });
    await queryInterface.addIndex('rpki_sync_logs', ['created_at'], { name: 'rpki_sync_logs_created_at' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rpki_sync_logs');
  },
};
