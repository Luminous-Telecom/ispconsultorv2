'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('saas_titulos', {
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
      plano_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'saas_planos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      banco_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'saas_bancos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      contrato_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'saas_contratos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      numero_titulo: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      valor: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      data_vencimento: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pendente', 'pago', 'vencido', 'cancelado', 'parcial', 'pago_atraso'),
        allowNull: false,
        defaultValue: 'pendente',
      },
      pago: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      data_pagamento: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      valor_pago: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      valor_aberto: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      codigo_barras: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      linha_digitavel: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      qrcode: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      qrcode_image: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      observacoes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      desconto_percentual: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      desconto_valor: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      acrescimo_percentual: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      acrescimo_valor: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      valor_final: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      charge_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      url_boleto: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      nosso_numero: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      is_avulso: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
    await queryInterface.addIndex('saas_titulos', ['empresa_id']);
    await queryInterface.addIndex('saas_titulos', ['plano_id']);
    await queryInterface.addIndex('saas_titulos', ['banco_id']);
    await queryInterface.addIndex('saas_titulos', ['contrato_id']);
    await queryInterface.addIndex('saas_titulos', ['status']);
    await queryInterface.addIndex('saas_titulos', ['data_vencimento']);
    await queryInterface.addIndex('saas_titulos', ['numero_titulo']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('saas_titulos');
  },
};
