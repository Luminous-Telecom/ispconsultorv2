'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rpki_aspas', {
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
      customer_asn: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
      },
      providers_json: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      afi: {
        type: Sequelize.ENUM('ipv4', 'ipv6', 'both'),
        allowNull: false,
        defaultValue: 'both',
      },
      status: {
        type: Sequelize.ENUM('active', 'revoked', 'expired'),
        allowNull: false,
        defaultValue: 'active',
      },
      not_before: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      not_after: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      revoked_at: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('rpki_aspas', ['empresa_id'], { name: 'rpki_aspas_empresa_id' });
    await queryInterface.addIndex('rpki_aspas', ['ca_id'], { name: 'rpki_aspas_ca_id' });
    await queryInterface.addIndex('rpki_aspas', ['customer_asn'], { name: 'rpki_aspas_customer_asn' });
    await queryInterface.addIndex('rpki_aspas', ['status'], { name: 'rpki_aspas_status' });
    await queryInterface.addIndex('rpki_aspas', ['customer_asn', 'afi', 'status'], {
      name: 'rpki_aspas_lookup',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rpki_aspas');
  },
};

