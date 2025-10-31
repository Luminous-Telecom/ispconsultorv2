'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('contratos', {
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
      desconto_percentual: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      desconto_valor: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      valor_final: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      data_inicio: {
        type: Sequelize.DATE,
        allowNull: true
      },
      data_fim: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('ativo', 'inativo', 'suspenso'),
        allowNull: false,
        defaultValue: 'ativo'
      },
      observacoes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isento_mensalidade: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      dia_vencimento_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'dias_vencimento',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      conta_boleto: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'bancos',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      data_validade_desconto: {
        type: Sequelize.DATE,
        allowNull: true
      },
      modelo_contrato_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'modelo_contrato',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
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

    await queryInterface.addIndex('contratos', ['cliente_id']);
    await queryInterface.addIndex('contratos', ['plano_id']);
    await queryInterface.addIndex('contratos', ['status']);
    await queryInterface.addIndex('contratos', ['cliente_id', 'plano_id'], { unique: true, name: 'contratos_cliente_plano_unique' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('contratos');
  }
};

