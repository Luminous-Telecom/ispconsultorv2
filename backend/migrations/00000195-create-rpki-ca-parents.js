'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rpki_ca_parents', {
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
      parent_name: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      service_uri: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      parent_handle: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      child_handle: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      provisioning_status: {
        type: Sequelize.ENUM('pending', 'active', 'error'),
        allowNull: false,
        defaultValue: 'pending',
      },
      last_sync_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      last_error: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('rpki_ca_parents', ['empresa_id'], { name: 'rpki_ca_parents_empresa_id' });
    await queryInterface.addIndex('rpki_ca_parents', ['ca_id'], { name: 'rpki_ca_parents_ca_id' });
    await queryInterface.addIndex('rpki_ca_parents', ['provisioning_status'], {
      name: 'rpki_ca_parents_provisioning_status',
    });
    await queryInterface.addIndex('rpki_ca_parents', ['ca_id', 'parent_name'], {
      name: 'rpki_ca_parents_ca_parent_unique',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rpki_ca_parents');
  },
};

