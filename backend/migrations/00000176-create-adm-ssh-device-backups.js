'use strict';

/**
 * Metadados de arquivos de backup SSH (conteúdo continua em arquivos/ssh-device-backups).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('adm_ssh_device_backups', {
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
      file_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Nome do arquivo no diretório ssh-device-backups (basename)',
      },
      size_bytes: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('adm_ssh_device_backups', ['ssh_device_id']);
    await queryInterface.addIndex('adm_ssh_device_backups', ['created_at']);
    await queryInterface.addIndex('adm_ssh_device_backups', ['ssh_device_id', 'file_name'], {
      unique: true,
      name: 'adm_ssh_device_backups_device_file_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('adm_ssh_device_backups');
  },
};
