'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rpki_alerts', {
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
      tipo: {
        type: Sequelize.ENUM('hijack-detected', 'roa-expiring'),
        allowNull: false,
      },
      prefixo: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      asn: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      },
      roa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'rpki_roas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      severity: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium',
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

    await queryInterface.addIndex('rpki_alerts', ['empresa_id'], { name: 'rpki_alerts_empresa_id' });
    await queryInterface.addIndex('rpki_alerts', ['tipo'], { name: 'rpki_alerts_tipo' });
    await queryInterface.addIndex('rpki_alerts', ['severity'], { name: 'rpki_alerts_severity' });
    await queryInterface.addIndex('rpki_alerts', ['resolved_at'], { name: 'rpki_alerts_resolved_at' });
    await queryInterface.addIndex('rpki_alerts', ['roa_id'], { name: 'rpki_alerts_roa_id' });
    await queryInterface.addIndex('rpki_alerts', ['severity', 'resolved_at'], { name: 'rpki_alerts_severity_resolved_at' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rpki_alerts');
  },
};
