'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rpki_repositories', {
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
      repository_name: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      rrdp_notify_uri: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      rsync_base_uri: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      publication_status: {
        type: Sequelize.ENUM('pending', 'active', 'error'),
        allowNull: false,
        defaultValue: 'pending',
      },
      last_publish_at: {
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

    await queryInterface.addIndex('rpki_repositories', ['empresa_id'], { name: 'rpki_repositories_empresa_id' });
    await queryInterface.addIndex('rpki_repositories', ['ca_id'], { name: 'rpki_repositories_ca_id' });
    await queryInterface.addIndex('rpki_repositories', ['publication_status'], {
      name: 'rpki_repositories_publication_status',
    });
    await queryInterface.addIndex('rpki_repositories', ['ca_id', 'repository_name'], {
      name: 'rpki_repositories_ca_name_unique',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rpki_repositories');
  },
};

