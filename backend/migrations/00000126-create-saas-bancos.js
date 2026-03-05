'use strict';

/**
 * Cria saas_bancos com estrutura completa (gateway EFI/Asaas, instruções, etc).
 * Consolidado: evita migration 130 que adicionava colunas e 135 que corrigia FK.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('saas_bancos', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'saas_dados_empresa',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      nome: {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: 'Banco',
      },
      banco: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      codigo: { type: Sequelize.STRING(10), allowNull: true },
      descricao: { type: Sequelize.TEXT, allowNull: true },
      tipo_banco: {
        type: Sequelize.ENUM('efi', 'asaas', 'bancario', 'outros'),
        allowNull: false,
        defaultValue: 'bancario',
      },
      agencia: { type: Sequelize.STRING(20), allowNull: true },
      conta: { type: Sequelize.STRING(30), allowNull: true },
      tipo_conta: {
        type: Sequelize.ENUM('corrente', 'poupanca', 'pagamento'),
        allowNull: false,
        defaultValue: 'corrente',
      },
      pix_chave: { type: Sequelize.STRING(255), allowNull: true },
      pix_tipo: {
        type: Sequelize.ENUM('cpf', 'cnpj', 'email', 'telefone', 'aleatoria'),
        allowNull: true,
      },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      api_url: { type: Sequelize.STRING(500), allowNull: true },
      api_key: { type: Sequelize.STRING(255), allowNull: true },
      api_secret: { type: Sequelize.STRING(255), allowNull: true },
      sandbox: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      identificador_conta: { type: Sequelize.STRING(100), allowNull: true },
      client_id_producao: { type: Sequelize.STRING(255), allowNull: true },
      client_secret_producao: { type: Sequelize.STRING(255), allowNull: true },
      url_retorno: { type: Sequelize.STRING(500), allowNull: true },
      webhook_secret: { type: Sequelize.STRING(255), allowNull: true },
      repassar_email_cliente: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      percentual_multa: { type: Sequelize.DECIMAL(5, 2), allowNull: true, defaultValue: 2 },
      percentual_juros: { type: Sequelize.DECIMAL(5, 2), allowNull: true, defaultValue: 1 },
      desconto_tipo: { type: Sequelize.STRING(50), allowNull: true },
      desconto_valor: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      contra_apresentacao: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      recalcular_segunda_via: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      maximo_dias_recalcular: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 30 },
      layout_web: { type: Sequelize.TEXT, allowNull: true },
      layout_pdf: { type: Sequelize.TEXT, allowNull: true },
      local_pagamento: { type: Sequelize.STRING(255), allowNull: true },
      dados_avalista: { type: Sequelize.TEXT, allowNull: true },
      exibir_mes_referente: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      taxa_cobranca: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      incluir_taxa: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      observacao_linha_1: { type: Sequelize.STRING(255), allowNull: true },
      observacao_linha_2: { type: Sequelize.STRING(255), allowNull: true },
      observacao_linha_3: { type: Sequelize.STRING(255), allowNull: true },
      observacao_linha_4: { type: Sequelize.STRING(255), allowNull: true },
      instrucao_linha_1: { type: Sequelize.STRING(255), allowNull: true },
      instrucao_linha_2: { type: Sequelize.STRING(255), allowNull: true },
      instrucao_linha_3: { type: Sequelize.STRING(255), allowNull: true },
      instrucao_linha_4: { type: Sequelize.STRING(255), allowNull: true },
      instrucao_linha_5: { type: Sequelize.STRING(255), allowNull: true },
      configuracoes: { type: Sequelize.JSON, allowNull: true },
      logo: { type: Sequelize.STRING(500), allowNull: true },
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

    await queryInterface.addIndex('saas_bancos', ['empresa_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('saas_bancos');
  },
};
