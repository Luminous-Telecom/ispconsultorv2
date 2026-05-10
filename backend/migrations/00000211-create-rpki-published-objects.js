'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rpki_published_objects', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      ca_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'rpki_cas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      repository_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'rpki_repositories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      uri: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      hash_sha256_hex: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      object_type: {
        type: Sequelize.ENUM('roa', 'mft', 'crl', 'cer'),
        allowNull: false,
      },
      object_der_b64: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
      },
      roa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'rpki_roas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('rpki_published_objects', ['ca_id']);
    await queryInterface.addIndex('rpki_published_objects', ['repository_id']);
    await queryInterface.addIndex('rpki_published_objects', ['uri'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rpki_published_objects');
  },
};
