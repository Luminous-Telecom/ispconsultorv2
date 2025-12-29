'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Criar tabela principal de fornecedores
    await queryInterface.createTable('fornecedores', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      tipo_pessoa: {
        type: Sequelize.ENUM('FISICA', 'JURIDICA'),
        allowNull: false
      },
      nome_razao_social: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      nome_fantasia: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      cpf_cnpj: {
        type: Sequelize.STRING(18),
        allowNull: false,
        unique: true
      },
      cep: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      logradouro: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      numero: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      complemento: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      bairro: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      cidade: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      estado: {
        type: Sequelize.STRING(2),
        allowNull: true
      },
      pais: {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: 'Brasil'
      },
      observacoes: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('fornecedores', ['cpf_cnpj'], { unique: true });
    await queryInterface.addIndex('fornecedores', ['tipo_pessoa']);
    await queryInterface.addIndex('fornecedores', ['nome_razao_social']);
    await queryInterface.addIndex('fornecedores', ['cidade']);
    await queryInterface.addIndex('fornecedores', ['estado']);

    // Criar tabela de contatos de fornecedores
    await queryInterface.createTable('fornecedor_contatos', {
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
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      tipo: {
        type: Sequelize.ENUM('telefone', 'email', 'whatsapp', 'celular', 'fixo', 'outro'),
        allowNull: false,
        defaultValue: 'telefone'
      },
      valor: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      principal: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

    await queryInterface.addIndex('fornecedor_contatos', ['fornecedor_id']);
    await queryInterface.addIndex('fornecedor_contatos', ['tipo']);
    await queryInterface.addIndex('fornecedor_contatos', ['principal']);

    // Criar tabela de arquivos de fornecedores
    await queryInterface.createTable('fornecedor_arquivos', {
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

    await queryInterface.addIndex('fornecedor_arquivos', ['fornecedor_id']);
    await queryInterface.addIndex('fornecedor_arquivos', ['tipo']);

    // Criar tabela de históricos de fornecedores
    await queryInterface.createTable('fornecedor_historicos', {
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
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      data: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
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
      descricao: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      tipo: {
        type: Sequelize.ENUM('criacao', 'atualizacao', 'exclusao', 'pagamento', 'outro'),
        allowNull: false,
        defaultValue: 'outro'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('fornecedor_historicos', ['fornecedor_id']);
    await queryInterface.addIndex('fornecedor_historicos', ['data']);
    await queryInterface.addIndex('fornecedor_historicos', ['usuario_id']);
    await queryInterface.addIndex('fornecedor_historicos', ['tipo']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('fornecedor_historicos');
    await queryInterface.dropTable('fornecedor_arquivos');
    await queryInterface.dropTable('fornecedor_contatos');
    await queryInterface.dropTable('fornecedores');
  }
};
