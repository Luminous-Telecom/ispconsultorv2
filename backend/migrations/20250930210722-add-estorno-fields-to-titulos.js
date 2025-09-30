'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Adicionar campos de estorno na tabela titulos
    await queryInterface.addColumn('titulos', 'estornado', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn('titulos', 'data_estorno', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('titulos', 'valor_estorno', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });

    await queryInterface.addColumn('titulos', 'motivo_estorno', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Atualizar enum do status para incluir 'estornado'
    await queryInterface.changeColumn('titulos', 'status', {
      type: Sequelize.ENUM('pendente', 'pago', 'vencido', 'cancelado', 'estornado'),
      allowNull: false,
      defaultValue: 'pendente'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remover campos de estorno
    await queryInterface.removeColumn('titulos', 'estornado');
    await queryInterface.removeColumn('titulos', 'data_estorno');
    await queryInterface.removeColumn('titulos', 'valor_estorno');
    await queryInterface.removeColumn('titulos', 'motivo_estorno');

    // Reverter enum do status
    await queryInterface.changeColumn('titulos', 'status', {
      type: Sequelize.ENUM('pendente', 'pago', 'vencido', 'cancelado'),
      allowNull: false,
      defaultValue: 'pendente'
    });
  }
};
