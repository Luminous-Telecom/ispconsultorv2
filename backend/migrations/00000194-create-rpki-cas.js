'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rpki_cas', {
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
      nome: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      handle: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'active', 'error', 'disabled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      ca_cert_pem: {
        type: Sequelize.TEXT('long'),
        allowNull: true,
      },
      private_key_pem: {
        type: Sequelize.TEXT('long'),
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

    await queryInterface.addIndex('rpki_cas', ['empresa_id'], { name: 'rpki_cas_empresa_id' });
    await queryInterface.addIndex('rpki_cas', ['status'], { name: 'rpki_cas_status' });
    await queryInterface.addIndex('rpki_cas', ['handle'], { name: 'rpki_cas_handle' });
    await queryInterface.addIndex('rpki_cas', ['empresa_id', 'handle'], {
      name: 'rpki_cas_empresa_handle_unique',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rpki_cas');
  },
};

