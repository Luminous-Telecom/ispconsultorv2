'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Adicionar campo valor_aberto
    await queryInterface.addColumn('titulos', 'valor_aberto', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Valor restante em aberto (para pagamentos parciais)'
    });

    // Alterar ENUM do status para incluir 'parcial' e 'pago_atraso'
    await queryInterface.changeColumn('titulos', 'status', {
      type: Sequelize.ENUM('pendente', 'pago', 'vencido', 'cancelado', 'parcial', 'pago_atraso'),
      allowNull: false,
      defaultValue: 'pendente'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remover campo valor_aberto
    await queryInterface.removeColumn('titulos', 'valor_aberto');

    // Reverter status para valores antigos (primeiro atualizar registros com 'parcial' e 'pago_atraso')
    await queryInterface.sequelize.query(
      "UPDATE titulos SET status = 'pendente' WHERE status IN ('parcial', 'pago_atraso')"
    );

    // Alterar ENUM do status removendo 'parcial' e 'pago_atraso'
    await queryInterface.changeColumn('titulos', 'status', {
      type: Sequelize.ENUM('pendente', 'pago', 'vencido', 'cancelado'),
      allowNull: false,
      defaultValue: 'pendente'
    });
  }
};
