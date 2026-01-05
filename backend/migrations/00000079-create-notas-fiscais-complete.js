'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Criar tabela notas_fiscais com todos os campos
    await queryInterface.createTable('notas_fiscais', {
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
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      titulo_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'titulos',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'ID do título vinculado à nota fiscal'
      },
      numero: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Número da nota fiscal'
      },
      serie: {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'Série da nota fiscal'
      },
      chave_acesso: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
        comment: 'Chave de acesso da NFS-e (50 caracteres)'
      },
      status: {
        type: Sequelize.ENUM('PENDENTE', 'PROCESSANDO', 'AUTORIZADA', 'CANCELADA', 'REJEITADA', 'ERRO'),
        allowNull: false,
        defaultValue: 'PENDENTE'
      },
      nfse_status: {
        type: Sequelize.ENUM('agendado', 'emitida', 'cancelada', 'rejeitada', 'erro'),
        allowNull: true,
        comment: 'Status da NFS-e: agendado, emitida, cancelada, rejeitada, erro'
      },
      asaas_invoice_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'ID da invoice no Asaas para vincular com webhooks'
      },
      tipo_operacao: {
        type: Sequelize.ENUM('ENTRADA', 'SAIDA'),
        allowNull: false,
        defaultValue: 'SAIDA'
      },
      modelo: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 55,
        comment: 'Modelo da nota fiscal (55 para NFS-e)'
      },
      natureza_operacao: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'PRESTAÇÃO DE SERVIÇOS'
      },
      data_emissao: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      data_vencimento: {
        type: Sequelize.DATE,
        allowNull: true
      },
      valor_total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      valor_produtos: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      valor_servicos: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      valor_desconto: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      valor_icms: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      valor_iss: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      aliquota_iss: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      cst_icms: {
        type: Sequelize.STRING(3),
        allowNull: true,
        comment: 'Código de Situação Tributária do ICMS'
      },
      cfop: {
        type: Sequelize.STRING(4),
        allowNull: true,
        comment: 'Código Fiscal de Operações e Prestações'
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Descrição dos serviços/produtos'
      },
      observacoes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      xml: {
        type: Sequelize.TEXT('long'),
        allowNull: true,
        comment: 'XML da nota fiscal'
      },
      pdf_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'URL do PDF da nota fiscal'
      },
      pdf_base64: {
        type: Sequelize.TEXT('long'),
        allowNull: true,
        comment: 'PDF da NFS-e em base64'
      },
      danfe_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'URL do DANFE (Documento Auxiliar da Nota Fiscal de Serviços Eletrônica)'
      },
      protocolo: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Protocolo de autorização da SEFAZ'
      },
      data_autorizacao: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Data de autorização pela SEFAZ'
      },
      mensagem_erro: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Mensagem de erro em caso de rejeição'
      },
      codigo_erro: {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'Código de erro da SEFAZ'
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

    // Índices para notas_fiscais
    await queryInterface.addIndex('notas_fiscais', ['cliente_id']);
    await queryInterface.addIndex('notas_fiscais', ['status']);
    await queryInterface.addIndex('notas_fiscais', ['chave_acesso']);
    await queryInterface.addIndex('notas_fiscais', ['numero']);
    await queryInterface.addIndex('notas_fiscais', ['data_emissao']);
    await queryInterface.addIndex('notas_fiscais', ['data_autorizacao']);
    await queryInterface.addIndex('notas_fiscais', ['titulo_id'], {
      name: 'idx_notas_fiscais_titulo_id'
    });
    await queryInterface.addIndex('notas_fiscais', ['nfse_status'], {
      name: 'idx_notas_fiscais_nfse_status'
    });
    await queryInterface.addIndex('notas_fiscais', ['asaas_invoice_id'], {
      name: 'idx_notas_fiscais_asaas_invoice_id'
    });

    // Criar tabela nfse_config com todos os campos
    await queryInterface.createTable('nfse_config', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      codigo_servico_municipal: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Código de serviço municipal para NFS-e'
      },
      aliquota_iss: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Alíquota padrão de ISS para NFS-e (%)'
      },
      descricao_servico: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Descrição padrão do serviço para NFS-e'
      },
      serie_nf: {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: '80000',
        comment: 'Série da NF (permitida: 80000 a 89999)'
      },
      numero_dps: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1,
        comment: 'Número do DPS (Documento de Prestação de Serviços)'
      },
      portal_nacional_username: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Usuário do Portal Nacional NFS-e'
      },
      portal_nacional_password: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Senha do Portal Nacional NFS-e'
      },
      portal_nacional_base_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
        defaultValue: 'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional',
        comment: 'URL base da API do Portal Nacional NFS-e (Homologação: https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional, Produção: https://sefin.nfse.gov.br/SefinNacional)'
      },
      portal_nacional_ambiente: {
        type: Sequelize.ENUM('HOMOLOGACAO', 'PRODUCAO'),
        allowNull: false,
        defaultValue: 'HOMOLOGACAO',
        comment: 'Ambiente do Portal Nacional (HOMOLOGACAO ou PRODUCAO)'
      },
      asaas_api_key: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'API Key do Asaas para emissão de NFS-e'
      },
      asaas_sandbox: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Usar ambiente sandbox do Asaas'
      },
      provider: {
        type: Sequelize.ENUM('PORTAL_NACIONAL', 'ASAAS'),
        allowNull: false,
        defaultValue: 'PORTAL_NACIONAL',
        comment: 'Provedor de NFS-e (PORTAL_NACIONAL, ASAAS)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Criar índice único para garantir apenas um registro em nfse_config
    await queryInterface.addIndex('nfse_config', ['id'], {
      unique: true,
      name: 'nfse_config_id_unique'
    });

    // Adicionar campo nota_fiscal_id à tabela titulos
    await queryInterface.addColumn('titulos', 'nota_fiscal_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'notas_fiscais',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'ID da nota fiscal vinculada ao título'
    });

    await queryInterface.addIndex('titulos', ['nota_fiscal_id'], {
      name: 'idx_titulos_nota_fiscal_id'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remover campo nota_fiscal_id de titulos
    await queryInterface.removeIndex('titulos', 'idx_titulos_nota_fiscal_id');
    await queryInterface.removeColumn('titulos', 'nota_fiscal_id');

    // Remover tabela nfse_config
    await queryInterface.dropTable('nfse_config');

    // Remover tabela notas_fiscais
    await queryInterface.dropTable('notas_fiscais');
  }
};

