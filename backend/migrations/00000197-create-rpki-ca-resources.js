'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rpki_ca_resources', {
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
        allowNull: false,
        references: { model: 'rpki_cas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      resource_type: {
        type: Sequelize.ENUM('asn', 'ipv4', 'ipv6'),
        allowNull: false,
      },
      start_range: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      end_range: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      max_length: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      source: {
        type: Sequelize.ENUM('manual', 'parent', 'imported'),
        allowNull: false,
        defaultValue: 'manual',
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

    await queryInterface.addIndex('rpki_ca_resources', ['empresa_id'], { name: 'rpki_ca_resources_empresa_id' });
    await queryInterface.addIndex('rpki_ca_resources', ['ca_id'], { name: 'rpki_ca_resources_ca_id' });
    await queryInterface.addIndex('rpki_ca_resources', ['resource_type'], { name: 'rpki_ca_resources_resource_type' });
    await queryInterface.addIndex('rpki_ca_resources', ['ca_id', 'resource_type', 'start_range'], {
      name: 'rpki_ca_resources_lookup',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rpki_ca_resources');
  },
};

