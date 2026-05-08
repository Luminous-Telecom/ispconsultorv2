'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rpki_roas', {
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
      prefix: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      asn: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
      },
      max_length: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      not_before: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      not_after: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('active', 'revoked', 'expired'),
        allowNull: false,
        defaultValue: 'active',
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

    await queryInterface.addIndex('rpki_roas', ['empresa_id'], { name: 'rpki_roas_empresa_id' });
    await queryInterface.addIndex('rpki_roas', ['prefix'], { name: 'rpki_roas_prefix' });
    await queryInterface.addIndex('rpki_roas', ['asn'], { name: 'rpki_roas_asn' });
    await queryInterface.addIndex('rpki_roas', ['status'], { name: 'rpki_roas_status' });
    await queryInterface.addIndex('rpki_roas', ['not_after'], { name: 'rpki_roas_not_after' });
    await queryInterface.addIndex('rpki_roas', ['prefix', 'asn', 'max_length', 'status'], {
      name: 'rpki_roas_lookup',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rpki_roas');
  },
};
