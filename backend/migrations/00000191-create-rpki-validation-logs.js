'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rpki_validation_logs', {
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
      prefix_length: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      state: {
        type: Sequelize.ENUM('valid', 'invalid', 'not-found'),
        allowNull: false,
      },
      matched_roa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'rpki_roas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      request_ip: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('rpki_validation_logs', ['empresa_id'], { name: 'rpki_validation_logs_empresa_id' });
    await queryInterface.addIndex('rpki_validation_logs', ['state'], { name: 'rpki_validation_logs_state' });
    await queryInterface.addIndex('rpki_validation_logs', ['created_at'], { name: 'rpki_validation_logs_created_at' });
    await queryInterface.addIndex('rpki_validation_logs', ['prefix'], { name: 'rpki_validation_logs_prefix' });
    await queryInterface.addIndex('rpki_validation_logs', ['asn'], { name: 'rpki_validation_logs_asn' });
    await queryInterface.addIndex('rpki_validation_logs', ['matched_roa_id'], { name: 'rpki_validation_logs_matched_roa_id' });
    await queryInterface.addIndex('rpki_validation_logs', ['state', 'created_at'], { name: 'rpki_validation_logs_state_created_at' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rpki_validation_logs');
  },
};
