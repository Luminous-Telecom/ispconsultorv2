'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('banco_configuracoes');
    
    if (!tableDescription.dia_vencimento_padrao) {
      await queryInterface.addColumn('banco_configuracoes', 'dia_vencimento_padrao', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5
      });
    }

    if (!tableDescription.usar_dia_cliente) {
      await queryInterface.addColumn('banco_configuracoes', 'usar_dia_cliente', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    if (!tableDescription.ajustar_para_proximo_mes) {
      await queryInterface.addColumn('banco_configuracoes', 'ajustar_para_proximo_mes', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
    }

    if (!tableDescription.dias_antecedencia_vencimento) {
      await queryInterface.addColumn('banco_configuracoes', 'dias_antecedencia_vencimento', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }

    if (!tableDescription.dias_vencimento_especiais) {
      await queryInterface.addColumn('banco_configuracoes', 'dias_vencimento_especiais', {
        type: Sequelize.JSON,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('banco_configuracoes');
    
    if (tableDescription.dias_vencimento_especiais) {
      await queryInterface.removeColumn('banco_configuracoes', 'dias_vencimento_especiais');
    }
    if (tableDescription.dias_antecedencia_vencimento) {
      await queryInterface.removeColumn('banco_configuracoes', 'dias_antecedencia_vencimento');
    }
    if (tableDescription.ajustar_para_proximo_mes) {
      await queryInterface.removeColumn('banco_configuracoes', 'ajustar_para_proximo_mes');
    }
    if (tableDescription.usar_dia_cliente) {
      await queryInterface.removeColumn('banco_configuracoes', 'usar_dia_cliente');
    }
    if (tableDescription.dia_vencimento_padrao) {
      await queryInterface.removeColumn('banco_configuracoes', 'dia_vencimento_padrao');
    }
  }
};