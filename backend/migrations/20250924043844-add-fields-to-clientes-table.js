'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('clientes');
    
    if (!tableDescription.tipo_cobranca) {
      await queryInterface.addColumn('clientes', 'tipo_cobranca', {
        type: Sequelize.ENUM('titulo', 'carne'),
        allowNull: false,
        defaultValue: 'titulo'
      });
    }

    if (!tableDescription.valor_primeiro_titulo) {
      await queryInterface.addColumn('clientes', 'valor_primeiro_titulo', {
        type: Sequelize.ENUM('total', 'proporcional'),
        allowNull: false,
        defaultValue: 'total'
      });
    }

    if (!tableDescription.isento_mensalidade) {
      await queryInterface.addColumn('clientes', 'isento_mensalidade', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    if (!tableDescription.recebe_email) {
      await queryInterface.addColumn('clientes', 'recebe_email', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
    }

    if (!tableDescription.recebe_sms) {
      await queryInterface.addColumn('clientes', 'recebe_sms', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    if (!tableDescription.recebe_whatsapp) {
      await queryInterface.addColumn('clientes', 'recebe_whatsapp', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
    }

    if (!tableDescription.dia_vencimento) {
      await queryInterface.addColumn('clientes', 'dia_vencimento', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    if (!tableDescription.conta_boleto) {
      await queryInterface.addColumn('clientes', 'conta_boleto', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'bancos',
          key: 'id'
        },
        onDelete: 'SET NULL'
      });
    }

    if (!tableDescription.dias_desconto) {
      await queryInterface.addColumn('clientes', 'dias_desconto', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5
      });
    }

    if (!tableDescription.desconto_data) {
      await queryInterface.addColumn('clientes', 'desconto_data', {
        type: Sequelize.DATEONLY,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('clientes');
    
    if (tableDescription.desconto_data) {
      await queryInterface.removeColumn('clientes', 'desconto_data');
    }
    if (tableDescription.dias_desconto) {
      await queryInterface.removeColumn('clientes', 'dias_desconto');
    }
    if (tableDescription.conta_boleto) {
      await queryInterface.removeColumn('clientes', 'conta_boleto');
    }
    if (tableDescription.dia_vencimento) {
      await queryInterface.removeColumn('clientes', 'dia_vencimento');
    }
    if (tableDescription.recebe_whatsapp) {
      await queryInterface.removeColumn('clientes', 'recebe_whatsapp');
    }
    if (tableDescription.recebe_sms) {
      await queryInterface.removeColumn('clientes', 'recebe_sms');
    }
    if (tableDescription.recebe_email) {
      await queryInterface.removeColumn('clientes', 'recebe_email');
    }
    if (tableDescription.isento_mensalidade) {
      await queryInterface.removeColumn('clientes', 'isento_mensalidade');
    }
    if (tableDescription.valor_primeiro_titulo) {
      await queryInterface.removeColumn('clientes', 'valor_primeiro_titulo');
    }
    if (tableDescription.tipo_cobranca) {
      await queryInterface.removeColumn('clientes', 'tipo_cobranca');
    }
  }
};