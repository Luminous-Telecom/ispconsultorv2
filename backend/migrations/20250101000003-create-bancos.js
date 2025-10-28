'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bancos', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      nome: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      codigo: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      tipo_banco: {
        type: Sequelize.ENUM('efi', 'asaas', 'bancario', 'outros'),
        allowNull: false,
        defaultValue: 'bancario'
      },
      api_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      api_key: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      api_secret: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      sandbox: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      identificador_conta: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      client_id_producao: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      client_secret_producao: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      url_retorno: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      repassar_email_cliente: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      percentual_multa: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 2.00
      },
      percentual_juros: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 1.00
      },
      desconto_tipo: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      desconto_valor: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      contra_apresentacao: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      recalcular_segunda_via: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      maximo_dias_recalcular: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 30
      },
      layout_web: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      layout_pdf: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      local_pagamento: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      dados_avalista: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      exibir_mes_referente: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      taxa_cobranca: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      incluir_taxa: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      observacao_linha_1: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      observacao_linha_2: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      observacao_linha_3: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      observacao_linha_4: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      instrucao_linha_1: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      instrucao_linha_2: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      instrucao_linha_3: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      instrucao_linha_4: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      instrucao_linha_5: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      configuracoes: {
        type: Sequelize.JSON,
        allowNull: true
      },
      logo: {
        type: Sequelize.STRING(500),
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

    await queryInterface.addIndex('bancos', ['ativo']);
    await queryInterface.addIndex('bancos', ['tipo_banco']);
    await queryInterface.addIndex('bancos', ['nome']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('bancos');
  }
};

