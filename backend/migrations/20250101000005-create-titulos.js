'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('titulos', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      cliente_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'clientes',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      plano_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'planos',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      banco_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'bancos',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      contrato_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'contratos',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      numero_titulo: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      valor: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      data_vencimento: {
        type: Sequelize.DATE,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pendente', 'pago', 'vencido', 'cancelado', 'parcial', 'pago_atraso'),
        allowNull: false,
        defaultValue: 'pendente'
      },
      pago: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      data_pagamento: {
        type: Sequelize.DATE,
        allowNull: true
      },
      valor_pago: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      valor_aberto: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      codigo_barras: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      linha_digitavel: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      qrcode: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      qrcode_image: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      observacoes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      desconto_percentual: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      desconto_valor: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      acrescimo_percentual: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      acrescimo_valor: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      valor_final: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      charge_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      url_boleto: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      nosso_numero: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('titulos', ['cliente_id']);
    await queryInterface.addIndex('titulos', ['plano_id']);
    await queryInterface.addIndex('titulos', ['banco_id']);
    await queryInterface.addIndex('titulos', ['contrato_id']);
    await queryInterface.addIndex('titulos', ['status']);
    await queryInterface.addIndex('titulos', ['data_vencimento']);
    await queryInterface.addIndex('titulos', ['pago']);
    await queryInterface.addIndex('titulos', ['numero_titulo'], { unique: true, name: 'titulos_numero_unique' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('titulos');
  }
};

