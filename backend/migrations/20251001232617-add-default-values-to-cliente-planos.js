'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Adicionar valores padrão para campos obrigatórios
    await queryInterface.changeColumn('cliente_planos', 'valor_final', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    });

    await queryInterface.changeColumn('cliente_planos', 'desconto_percentual', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    });

    await queryInterface.changeColumn('cliente_planos', 'desconto_valor', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    });

    await queryInterface.changeColumn('cliente_planos', 'status', {
      type: Sequelize.ENUM('ativo', 'inativo', 'suspenso'),
      allowNull: false,
      defaultValue: 'ativo'
    });

    await queryInterface.changeColumn('cliente_planos', 'isento_mensalidade', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.changeColumn('cliente_planos', 'dia_vencimento', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 10
    });
  },

  async down(queryInterface, Sequelize) {
    // Remover valores padrão
    await queryInterface.changeColumn('cliente_planos', 'valor_final', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });

    await queryInterface.changeColumn('cliente_planos', 'desconto_percentual', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true
    });

    await queryInterface.changeColumn('cliente_planos', 'desconto_valor', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });

    await queryInterface.changeColumn('cliente_planos', 'status', {
      type: Sequelize.ENUM('ativo', 'inativo', 'suspenso'),
      allowNull: true
    });

    await queryInterface.changeColumn('cliente_planos', 'isento_mensalidade', {
      type: Sequelize.BOOLEAN,
      allowNull: true
    });

    await queryInterface.changeColumn('cliente_planos', 'dia_vencimento', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  }
};