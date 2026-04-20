'use strict';

/**
 * Histórico de execuções de backup por equipamento (métricas do dashboard, sem depender de logs ES).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('adm_ssh_device_backup_events', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      ssh_device_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'adm_ssh_devices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'adm_dados_empresa', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        comment:
          'falha | sucesso | somente_local | falha_envio | verificado (extensível; hoje o runner grava falha/sucesso)',
      },
      detail: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('adm_ssh_device_backup_events', ['ssh_device_id']);
    await queryInterface.addIndex('adm_ssh_device_backup_events', ['empresa_id', 'created_at']);
    await queryInterface.addIndex('adm_ssh_device_backup_events', ['created_at']);
    await queryInterface.addIndex('adm_ssh_device_backup_events', ['status', 'created_at']);

    // Backfill: cada arquivo de backup existente vira um evento "sucesso" na data do arquivo
    await queryInterface.sequelize.query(`
      INSERT INTO adm_ssh_device_backup_events (ssh_device_id, empresa_id, status, detail, created_at)
      SELECT b.ssh_device_id, d.empresa_id, 'sucesso', NULL, b.created_at
      FROM adm_ssh_device_backups b
      INNER JOIN adm_ssh_devices d ON d.id = b.ssh_device_id
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('adm_ssh_device_backup_events');
  },
};
