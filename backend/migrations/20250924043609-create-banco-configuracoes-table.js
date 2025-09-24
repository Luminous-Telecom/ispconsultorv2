'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('banco_configuracoes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
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
      tipo_banco: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'geral'
      },
      
      // Configurações gerais da API
      api_url: {
        type: Sequelize.STRING,
        allowNull: true
      },
      api_key: {
        type: Sequelize.STRING,
        allowNull: true
      },
      api_secret: {
        type: Sequelize.STRING,
        allowNull: true
      },
      sandbox: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      
      // Configurações específicas da Efi
      cedente: {
        type: Sequelize.STRING,
        allowNull: true
      },
      identificador_conta: {
        type: Sequelize.STRING,
        allowNull: true
      },
      client_id_producao: {
        type: Sequelize.STRING,
        allowNull: true
      },
      client_secret_producao: {
        type: Sequelize.STRING,
        allowNull: true
      },
      url_retorno: {
        type: Sequelize.STRING,
        allowNull: true
      },
      repassar_email_cliente: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      
      // Multa, mora e desconto
      percentual_multa: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0
      },
      percentual_juros: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0
      },
      
      // Desconto até vencimento
      desconto_tipo: {
        type: Sequelize.ENUM('fixo', 'percentual'),
        allowNull: false,
        defaultValue: 'fixo'
      },
      desconto_valor: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      
      // Cálculo automático
      contra_apresentacao: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      recalcular_segunda_via: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      maximo_dias_recalcular: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      
      // Layout do boleto
      layout_web: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pdf'
      },
      layout_pdf: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pdf'
      },
      layout_carne: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '3folhas'
      },
      local_pagamento: {
        type: Sequelize.TEXT,
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
      
      // Configuração de pagamento
      documento_cpf_cnpj: {
        type: Sequelize.STRING,
        allowNull: true
      },
      taxa_cobranca: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      incluir_taxa: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      
      // Observações (4 linhas)
      observacao_linha_1: {
        type: Sequelize.STRING,
        allowNull: true
      },
      observacao_linha_2: {
        type: Sequelize.STRING,
        allowNull: true
      },
      observacao_linha_3: {
        type: Sequelize.STRING,
        allowNull: true
      },
      observacao_linha_4: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      // Instruções ao caixa (5 linhas)
      instrucao_linha_1: {
        type: Sequelize.STRING,
        allowNull: true
      },
      instrucao_linha_2: {
        type: Sequelize.STRING,
        allowNull: true
      },
      instrucao_linha_3: {
        type: Sequelize.STRING,
        allowNull: true
      },
      instrucao_linha_4: {
        type: Sequelize.STRING,
        allowNull: true
      },
      instrucao_linha_5: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      // Configurações adicionais em JSON para campos específicos de cada banco
      configuracoes_extras: {
        type: Sequelize.JSON,
        allowNull: true
      },
      
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Índices
    await queryInterface.addIndex('banco_configuracoes', ['banco_id', 'tipo_banco']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('banco_configuracoes');
  }
};