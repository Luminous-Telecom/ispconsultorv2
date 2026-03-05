'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('saas_contratos', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'saas_dados_empresa',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      plano_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'saas_planos',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      data_inicio: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      data_fim: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      tipo: {
        type: Sequelize.ENUM('mensal', 'anual'),
        allowNull: false,
        defaultValue: 'mensal',
      },
      status: {
        type: Sequelize.ENUM('ativo', 'cancelado', 'expirado', 'pendente'),
        allowNull: false,
        defaultValue: 'ativo',
      },
      valor: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      dia_vencimento: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      observacoes: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('saas_contratos', ['empresa_id']);
    await queryInterface.addIndex('saas_contratos', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('saas_contratos');
  },
};
