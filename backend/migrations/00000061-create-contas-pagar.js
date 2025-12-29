'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Criar tabela principal de contas a pagar
    await queryInterface.createTable('contas_pagar', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      fornecedor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'fornecedores',
          key: 'id'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      data_vencimento: {
        type: Sequelize.DATE,
        allowNull: false
      },
      valor: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      tipo_pagamento: {
        type: Sequelize.ENUM('DINHEIRO', 'BOLETO', 'CARTAO', 'DEPOSITO', 'DEBITO_CONTA', 'TRANSFERENCIA', 'PIX'),
        allowNull: false,
        defaultValue: 'PIX'
      },
      numero_documento: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      nota_fiscal: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      observacoes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('A_PAGAR', 'PAGO', 'PARCIAL', 'CANCELADO'),
        allowNull: false,
        defaultValue: 'A_PAGAR'
      },
      valor_pago: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      data_pagamento: {
        type: Sequelize.DATE,
        allowNull: true
      },
      data_cadastro: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
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

    await queryInterface.addIndex('contas_pagar', ['fornecedor_id']);
    await queryInterface.addIndex('contas_pagar', ['data_vencimento']);
    await queryInterface.addIndex('contas_pagar', ['status']);
    await queryInterface.addIndex('contas_pagar', ['tipo_pagamento']);
    await queryInterface.addIndex('contas_pagar', ['data_pagamento']);

    // Criar tabela de arquivos de contas a pagar
    await queryInterface.createTable('conta_pagar_arquivos', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      conta_pagar_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'contas_pagar',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      nome: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      tipo: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      caminho: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      tamanho: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      data_upload: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
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

    await queryInterface.addIndex('conta_pagar_arquivos', ['conta_pagar_id']);
    await queryInterface.addIndex('conta_pagar_arquivos', ['tipo']);

    // Criar tabela de pagamentos (histórico de pagamentos)
    await queryInterface.createTable('conta_pagar_pagamentos', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      conta_pagar_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'contas_pagar',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      data: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      valor: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      tipo_pagamento: {
        type: Sequelize.ENUM('DINHEIRO', 'BOLETO', 'CARTAO', 'DEPOSITO', 'DEBITO_CONTA', 'TRANSFERENCIA', 'PIX'),
        allowNull: false
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      observacao: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('conta_pagar_pagamentos', ['conta_pagar_id']);
    await queryInterface.addIndex('conta_pagar_pagamentos', ['data']);
    await queryInterface.addIndex('conta_pagar_pagamentos', ['usuario_id']);
    await queryInterface.addIndex('conta_pagar_pagamentos', ['tipo_pagamento']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('conta_pagar_pagamentos');
    await queryInterface.dropTable('conta_pagar_arquivos');
    await queryInterface.dropTable('contas_pagar');
  }
};
