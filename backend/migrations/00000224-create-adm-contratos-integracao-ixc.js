'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('adm_contratos_integracao_ixc', {
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
      contrato_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'adm_contratos_contratos',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      api_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      api_token: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      ativo: {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('adm_contratos_integracao_ixc', ['contrato_id'], {
      unique: true,
      name: 'adm_contratos_integracao_ixc_contrato_id_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('adm_contratos_integracao_ixc');
  },
};
