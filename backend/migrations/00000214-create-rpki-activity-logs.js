'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rpki_activity_logs', {
      id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'adm_sistema_dados_empresa', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      ca_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'rpki_cas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      object_type: { type: Sequelize.ENUM('roa', 'aspa'), allowNull: false },
      object_id: { type: Sequelize.INTEGER, allowNull: true },
      action: { type: Sequelize.ENUM('create', 'revoke', 'delete'), allowNull: false },
      details: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('rpki_activity_logs', ['empresa_id'], { name: 'rpki_activity_logs_empresa_id' });
    await queryInterface.addIndex('rpki_activity_logs', ['ca_id'], { name: 'rpki_activity_logs_ca_id' });
    await queryInterface.addIndex('rpki_activity_logs', ['object_type'], { name: 'rpki_activity_logs_object_type' });
    await queryInterface.addIndex('rpki_activity_logs', ['created_at'], { name: 'rpki_activity_logs_created_at' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rpki_activity_logs');
  },
};
