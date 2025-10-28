'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('banco_configuracoes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      banco_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'bancos',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      tipo_banco: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      configuracao: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: '{}'
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      observacoes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('banco_configuracoes', ['banco_id']);
    await queryInterface.addIndex('banco_configuracoes', ['tipo_banco']);
    await queryInterface.addIndex('banco_configuracoes', ['ativo']);
    await queryInterface.addIndex('banco_configuracoes', ['banco_id', 'tipo_banco']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('banco_configuracoes');
  }
};

