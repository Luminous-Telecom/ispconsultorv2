'use strict';

/**
 * Migration: Criar tabela de auditoria
 * Registra ações críticas do sistema (criação, edição, exclusão)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('auditoria', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      acao: {
        type: Sequelize.ENUM('create', 'update', 'delete', 'login', 'logout', 'export', 'import'),
        allowNull: false,
        comment: 'Tipo de ação realizada'
      },
      entidade: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Nome da entidade afetada (ex: Cliente, Contrato, Titulo)'
      },
      entidade_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ID da entidade afetada'
      },
      dados_anteriores: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Dados anteriores (para updates)'
      },
      dados_novos: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Dados novos (para creates/updates)'
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'Endereço IP do usuário'
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'User agent do navegador'
      },
      observacoes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Observações adicionais sobre a ação'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Índices para melhorar performance de consultas
    await queryInterface.addIndex('auditoria', ['usuario_id'], {
      name: 'idx_auditoria_usuario_id'
    });

    await queryInterface.addIndex('auditoria', ['acao'], {
      name: 'idx_auditoria_acao'
    });

    await queryInterface.addIndex('auditoria', ['entidade'], {
      name: 'idx_auditoria_entidade'
    });

    await queryInterface.addIndex('auditoria', ['entidade_id'], {
      name: 'idx_auditoria_entidade_id'
    });

    await queryInterface.addIndex('auditoria', ['created_at'], {
      name: 'idx_auditoria_created_at'
    });

    // Índice composto para consultas frequentes
    await queryInterface.addIndex('auditoria', ['entidade', 'entidade_id'], {
      name: 'idx_auditoria_entidade_entidade_id'
    });

    await queryInterface.addIndex('auditoria', ['usuario_id', 'created_at'], {
      name: 'idx_auditoria_usuario_created'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('auditoria');
  }
};

