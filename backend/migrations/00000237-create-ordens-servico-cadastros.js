'use strict';

async function createCadastroTable(queryInterface, Sequelize, tableName) {
  await queryInterface.createTable(tableName, {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    empresa_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
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

  await queryInterface.addIndex(tableName, ['empresa_id']);
  await queryInterface.addIndex(tableName, ['ixc_id']);
  await queryInterface.addIndex(tableName, ['ixc']);
  await queryInterface.addIndex(tableName, ['empresa_id', 'ixc_id'], {
    unique: true,
    name: `${tableName}_empresa_ixc_id`,
  });
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await createCadastroTable(queryInterface, Sequelize, 'ordens_servico_filiais');
    await createCadastroTable(queryInterface, Sequelize, 'ordens_servico_setores');
    await createCadastroTable(queryInterface, Sequelize, 'ordens_servico_tecnicos');
    await createCadastroTable(queryInterface, Sequelize, 'ordens_servico_assuntos');
    await createCadastroTable(queryInterface, Sequelize, 'ordens_servico_estruturas');
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ordens_servico_estruturas');
    await queryInterface.dropTable('ordens_servico_assuntos');
    await queryInterface.dropTable('ordens_servico_tecnicos');
    await queryInterface.dropTable('ordens_servico_setores');
    await queryInterface.dropTable('ordens_servico_filiais');
  },
};
