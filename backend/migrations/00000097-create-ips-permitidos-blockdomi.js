'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ips_permitidos_blockdomi', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      cliente_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'clientes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      faixa_ips: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'IPs ou faixas separados por ; (ex: 192.168.1.1;10.0.0.0/24)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.addIndex('ips_permitidos_blockdomi', ['cliente_id'], { unique: true });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ips_permitidos_blockdomi');
  }
};
