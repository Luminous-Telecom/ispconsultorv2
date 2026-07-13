'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('atendimentos_departamentos', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'sistema_tenants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      integracao_ixc_provedor_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'integracao_ixc_provedor',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      nome: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      ixc_id: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      ixc: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('atendimentos_departamentos', ['empresa_id']);
    await queryInterface.addIndex('atendimentos_departamentos', ['integracao_ixc_provedor_id']);
    await queryInterface.addIndex('atendimentos_departamentos', ['ixc_id']);
    await queryInterface.addIndex('atendimentos_departamentos', ['ixc']);
    await queryInterface.addIndex(
      'atendimentos_departamentos',
      ['integracao_ixc_provedor_id', 'ixc_id'],
      {
        unique: true,
        name: 'atendimentos_departamentos_integracao_ixc_id',
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('atendimentos_departamentos');
  },
};
