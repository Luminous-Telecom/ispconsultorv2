'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('saas_dias_vencimento', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'dados_empresa', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      dia: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      dia_padrao: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
    await queryInterface.addIndex('saas_dias_vencimento', ['empresa_id']);
    await queryInterface.addIndex('saas_dias_vencimento', ['ativo']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('saas_dias_vencimento');
  },
};
