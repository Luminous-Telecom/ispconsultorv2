'use strict';

/**
 * Histórico de execuções de backup por equipamento (métricas do dashboard, sem depender de logs ES).
 *
 * FKs são adicionadas com addConstraint após createTable (sem `references` inline),
 * para evitar errno 150 "Foreign key constraint is incorrectly formed" em alguns
 * ambientes MariaDB/MySQL com Sequelize ao embutir várias FKs no mesmo CREATE TABLE.
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
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
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

    // Não chamar addIndex em ssh_device_id aqui: addConstraint da FK cria o índice
    // `adm_ssh_device_backup_events_ssh_device_id` e um segundo addIndex gera errno 1061
    // (Duplicate key name) em produção.
    await queryInterface.addIndex('adm_ssh_device_backup_events', ['empresa_id', 'created_at']);
    await queryInterface.addIndex('adm_ssh_device_backup_events', ['created_at']);
    await queryInterface.addIndex('adm_ssh_device_backup_events', ['status', 'created_at']);

    await queryInterface.addConstraint('adm_ssh_device_backup_events', {
      fields: ['ssh_device_id'],
      type: 'foreign key',
      name: 'adm_ssh_device_backup_events_device_fk',
      references: { table: 'adm_ssh_devices', field: 'id' },
      onUpdate: 'cascade',
      onDelete: 'cascade',
    });

    await queryInterface.addConstraint('adm_ssh_device_backup_events', {
      fields: ['empresa_id'],
      type: 'foreign key',
      name: 'adm_ssh_device_backup_events_empresa_fk',
      references: { table: 'adm_dados_empresa', field: 'id' },
      onUpdate: 'cascade',
      onDelete: 'set null',
    });

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
