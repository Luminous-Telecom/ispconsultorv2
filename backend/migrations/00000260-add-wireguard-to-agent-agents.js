'use strict';

/** Túnel WireGuard com o MikroTik do cliente (agente sem host Linux/Windows). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('agent_agents', 'connection_mode', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'socket',
    });
    await queryInterface.addColumn('agent_agents', 'mikrotik_host', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn('agent_agents', 'mikrotik_api_port', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('agent_agents', 'mikrotik_api_tls', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('agent_agents', 'mikrotik_username', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.addColumn('agent_agents', 'mikrotik_password', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('agent_agents', 'wg_listen_port', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('agent_agents', 'wg_lan_cidrs', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.addColumn('agent_agents', 'wg_interface_name', {
      type: Sequelize.STRING(15),
      allowNull: true,
    });
    await queryInterface.addColumn('agent_agents', 'wg_our_public_key', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.addColumn('agent_agents', 'wg_our_private_key', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('agent_agents', 'wg_peer_public_key', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.addColumn('agent_agents', 'wg_address_ours', {
      type: Sequelize.STRING(45),
      allowNull: true,
    });
    await queryInterface.addColumn('agent_agents', 'wg_address_peer', {
      type: Sequelize.STRING(45),
      allowNull: true,
    });
    await queryInterface.addColumn('agent_agents', 'wg_status', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'idle',
    });
    await queryInterface.addColumn('agent_agents', 'wg_last_handshake_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('agent_agents', 'wg_last_error', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    const columns = [
      'connection_mode',
      'mikrotik_host',
      'mikrotik_api_port',
      'mikrotik_api_tls',
      'mikrotik_username',
      'mikrotik_password',
      'wg_listen_port',
      'wg_lan_cidrs',
      'wg_interface_name',
      'wg_our_public_key',
      'wg_our_private_key',
      'wg_peer_public_key',
      'wg_address_ours',
      'wg_address_peer',
      'wg_status',
      'wg_last_handshake_at',
      'wg_last_error',
    ];
    for (const column of columns) {
      await queryInterface.removeColumn('agent_agents', column);
    }
  },
};
