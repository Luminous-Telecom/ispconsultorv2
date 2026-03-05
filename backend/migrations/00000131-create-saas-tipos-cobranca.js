'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('saas_tipos_cobranca', {
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
      nome: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      quantidade_titulos: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      periodicidade: {
        type: Sequelize.ENUM('mensal', 'bimestral', 'trimestral', 'semestral', 'anual', 'quinzenal', 'semanal'),
        allowNull: false,
        defaultValue: 'mensal',
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
    await queryInterface.addIndex('saas_tipos_cobranca', ['empresa_id']);
    await queryInterface.addIndex('saas_tipos_cobranca', ['ativo']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('saas_tipos_cobranca');
  },
};
