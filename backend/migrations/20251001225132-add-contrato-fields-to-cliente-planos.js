'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('cliente_planos');
    
    if (!tableDescription.isento_mensalidade) {
      await queryInterface.addColumn('cliente_planos', 'isento_mensalidade', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Se o cliente está isento de mensalidade'
      });
    }

    if (!tableDescription.dia_vencimento) {
      await queryInterface.addColumn('cliente_planos', 'dia_vencimento', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Dia do mês para vencimento da mensalidade'
      });
    }

    if (!tableDescription.conta_boleto) {
      await queryInterface.addColumn('cliente_planos', 'conta_boleto', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ID do banco para geração de boleto',
        references: {
          model: 'bancos',
          key: 'id'
        }
      });
    }

    if (!tableDescription.data_validade_desconto) {
      await queryInterface.addColumn('cliente_planos', 'data_validade_desconto', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Data de validade do desconto aplicado'
      });
    }
  },

  async down (queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('cliente_planos');
    
    if (tableDescription.data_validade_desconto) {
      await queryInterface.removeColumn('cliente_planos', 'data_validade_desconto');
    }
    if (tableDescription.conta_boleto) {
      await queryInterface.removeColumn('cliente_planos', 'conta_boleto');
    }
    if (tableDescription.dia_vencimento) {
      await queryInterface.removeColumn('cliente_planos', 'dia_vencimento');
    }
    if (tableDescription.isento_mensalidade) {
      await queryInterface.removeColumn('cliente_planos', 'isento_mensalidade');
    }
  }
};
