'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Criar nova tabela modelo_documento
    await queryInterface.createTable('modelo_documento', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      nome: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      tipo: {
        type: Sequelize.ENUM('contrato', 'recibo', 'carta', 'boleto', 'comprovante', 'outro'),
        allowNull: false
      },
      conteudo: {
        type: Sequelize.TEXT('long'),
        allowNull: true
      },
      conteudo_adesao: {
        type: Sequelize.TEXT('long'),
        allowNull: true
      },
      conteudo_permanencia: {
        type: Sequelize.TEXT('long'),
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
      tamanho_maximo: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10485760
      },
      tipos_permitidos: {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: 'pdf,doc,docx,xls,xlsx'
      },
      retencao_dias: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 365
      },
      auto_backup: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      criptografia: {
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

    // Adicionar coluna temporária para mapeamento
    await queryInterface.addColumn('modelo_documento', 'old_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn('modelo_documento', 'old_table', {
      type: Sequelize.STRING(50),
      allowNull: true
    });

    // Adicionar índices
    await queryInterface.addIndex('modelo_documento', ['ativo']);
    await queryInterface.addIndex('modelo_documento', ['tipo']);

    // Migrar dados de modelo_contrato
    await queryInterface.sequelize.query(`
      INSERT INTO modelo_documento (
        nome, tipo, conteudo, conteudo_adesao, conteudo_permanencia,
        descricao, ativo, tamanho_maximo, tipos_permitidos,
        retencao_dias, auto_backup, criptografia,
        created_at, updated_at, old_id, old_table
      )
      SELECT 
        nome,
        COALESCE(tipo, 'contrato') as tipo,
        conteudo,
        conteudo_adesao,
        conteudo_permanencia,
        descricao,
        ativo,
        tamanho_maximo,
        tipos_permitidos,
        retencao_dias,
        auto_backup,
        criptografia,
        created_at,
        updated_at,
        id as old_id,
        'modelo_contrato' as old_table
      FROM modelo_contrato
    `);

    // Migrar dados de modelo_recibo
    await queryInterface.sequelize.query(`
      INSERT INTO modelo_documento (
        nome, tipo, conteudo, conteudo_adesao, conteudo_permanencia,
        descricao, ativo, tamanho_maximo, tipos_permitidos,
        retencao_dias, auto_backup, criptografia,
        created_at, updated_at, old_id, old_table
      )
      SELECT 
        nome,
        'recibo' as tipo,
        conteudo,
        NULL as conteudo_adesao,
        NULL as conteudo_permanencia,
        descricao,
        ativo,
        tamanho_maximo,
        tipos_permitidos,
        retencao_dias,
        auto_backup,
        criptografia,
        created_at,
        updated_at,
        id as old_id,
        'modelo_recibo' as old_table
      FROM modelo_recibo
    `);

    // Migrar dados de modelo_carta
    await queryInterface.sequelize.query(`
      INSERT INTO modelo_documento (
        nome, tipo, conteudo, conteudo_adesao, conteudo_permanencia,
        descricao, ativo, tamanho_maximo, tipos_permitidos,
        retencao_dias, auto_backup, criptografia,
        created_at, updated_at, old_id, old_table
      )
      SELECT 
        nome,
        'carta' as tipo,
        conteudo,
        NULL as conteudo_adesao,
        NULL as conteudo_permanencia,
        descricao,
        ativo,
        tamanho_maximo,
        tipos_permitidos,
        retencao_dias,
        auto_backup,
        criptografia,
        created_at,
        updated_at,
        id as old_id,
        'modelo_carta' as old_table
      FROM modelo_carta
    `);

    // Atualizar referências em contratos
    await queryInterface.sequelize.query(`
      UPDATE contratos c
      INNER JOIN modelo_documento md ON md.old_id = c.modelo_contrato_id AND md.old_table = 'modelo_contrato'
      SET c.modelo_contrato_id = md.id
      WHERE c.modelo_contrato_id IS NOT NULL
    `);

    // Renomear coluna modelo_contrato_id para modelo_documento_id em contratos
    await queryInterface.renameColumn('contratos', 'modelo_contrato_id', 'modelo_documento_id');

    // Atualizar foreign key em contratos (tentar remover constraint antiga se existir)
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE contratos 
        DROP FOREIGN KEY contratos_ibfk_5
      `);
    } catch (e) {
      // Constraint pode não existir ou ter nome diferente, continuar
    }

    await queryInterface.addConstraint('contratos', {
      fields: ['modelo_documento_id'],
      type: 'foreign key',
      name: 'contratos_modelo_documento_fk',
      references: {
        table: 'modelo_documento',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // Atualizar referências em modelo_termo_adesao
    await queryInterface.sequelize.query(`
      UPDATE modelo_termo_adesao mta
      INNER JOIN modelo_documento md ON md.old_id = mta.modelo_contrato_id AND md.old_table = 'modelo_contrato'
      SET mta.modelo_contrato_id = md.id
      WHERE mta.modelo_contrato_id IS NOT NULL
    `);

    // Renomear coluna em modelo_termo_adesao
    await queryInterface.renameColumn('modelo_termo_adesao', 'modelo_contrato_id', 'modelo_documento_id');

    // Atualizar foreign key em modelo_termo_adesao
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE modelo_termo_adesao 
        DROP FOREIGN KEY modelo_termo_adesao_ibfk_1
      `);
    } catch (e) {
      // Constraint pode não existir ou ter nome diferente
    }

    await queryInterface.addConstraint('modelo_termo_adesao', {
      fields: ['modelo_documento_id'],
      type: 'foreign key',
      name: 'modelo_termo_adesao_modelo_documento_fk',
      references: {
        table: 'modelo_documento',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Atualizar referências em modelo_contrato_conteudo
    await queryInterface.sequelize.query(`
      UPDATE modelo_contrato_conteudo mcc
      INNER JOIN modelo_documento md ON md.old_id = mcc.modelo_contrato_id AND md.old_table = 'modelo_contrato'
      SET mcc.modelo_contrato_id = md.id
      WHERE mcc.modelo_contrato_id IS NOT NULL
    `);

    // Renomear coluna em modelo_contrato_conteudo
    await queryInterface.renameColumn('modelo_contrato_conteudo', 'modelo_contrato_id', 'modelo_documento_id');

    // Atualizar foreign key em modelo_contrato_conteudo
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE modelo_contrato_conteudo 
        DROP FOREIGN KEY modelo_contrato_conteudo_ibfk_1
      `);
    } catch (e) {
      // Constraint pode não existir ou ter nome diferente
    }

    await queryInterface.addConstraint('modelo_contrato_conteudo', {
      fields: ['modelo_documento_id'],
      type: 'foreign key',
      name: 'modelo_contrato_conteudo_modelo_documento_fk',
      references: {
        table: 'modelo_documento',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Atualizar referências em modelo_contrato_permanencia
    await queryInterface.sequelize.query(`
      UPDATE modelo_contrato_permanencia mcp
      INNER JOIN modelo_documento md ON md.old_id = mcp.modelo_contrato_id AND md.old_table = 'modelo_contrato'
      SET mcp.modelo_contrato_id = md.id
      WHERE mcp.modelo_contrato_id IS NOT NULL
    `);

    // Renomear coluna em modelo_contrato_permanencia
    await queryInterface.renameColumn('modelo_contrato_permanencia', 'modelo_contrato_id', 'modelo_documento_id');

    // Atualizar foreign key em modelo_contrato_permanencia
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE modelo_contrato_permanencia 
        DROP FOREIGN KEY modelo_contrato_permanencia_ibfk_1
      `);
    } catch (e) {
      // Constraint pode não existir ou ter nome diferente
    }

    await queryInterface.addConstraint('modelo_contrato_permanencia', {
      fields: ['modelo_documento_id'],
      type: 'foreign key',
      name: 'modelo_contrato_permanencia_modelo_documento_fk',
      references: {
        table: 'modelo_documento',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Atualizar índices (remover índices antigos se existirem)
    try {
      await queryInterface.removeIndex('modelo_termo_adesao', 'modelo_termo_adesao_modelo_contrato_id');
    } catch (e) {
      // Índice pode não existir
    }
    await queryInterface.addIndex('modelo_termo_adesao', ['modelo_documento_id'], {
      name: 'modelo_termo_adesao_modelo_documento_id'
    });

    try {
      await queryInterface.removeIndex('modelo_contrato_conteudo', 'modelo_contrato_conteudo_modelo_contrato_id');
    } catch (e) {
      // Índice pode não existir
    }
    await queryInterface.addIndex('modelo_contrato_conteudo', ['modelo_documento_id'], {
      name: 'modelo_contrato_conteudo_modelo_documento_id'
    });

    try {
      await queryInterface.removeIndex('modelo_contrato_permanencia', 'modelo_contrato_permanencia_modelo_contrato_id');
    } catch (e) {
      // Índice pode não existir
    }
    await queryInterface.addIndex('modelo_contrato_permanencia', ['modelo_documento_id'], {
      name: 'modelo_contrato_permanencia_modelo_documento_id'
    });

    // Remover colunas temporárias
    await queryInterface.removeColumn('modelo_documento', 'old_id');
    await queryInterface.removeColumn('modelo_documento', 'old_table');
  },

  down: async (queryInterface, Sequelize) => {
    // Reverter renomeações de colunas
    await queryInterface.renameColumn('contratos', 'modelo_documento_id', 'modelo_contrato_id');
    await queryInterface.renameColumn('modelo_termo_adesao', 'modelo_documento_id', 'modelo_contrato_id');
    await queryInterface.renameColumn('modelo_contrato_conteudo', 'modelo_documento_id', 'modelo_contrato_id');
    await queryInterface.renameColumn('modelo_contrato_permanencia', 'modelo_documento_id', 'modelo_contrato_id');

    // Remover foreign keys
    await queryInterface.removeConstraint('contratos', 'contratos_modelo_documento_fk');
    await queryInterface.removeConstraint('modelo_termo_adesao', 'modelo_termo_adesao_modelo_documento_fk');
    await queryInterface.removeConstraint('modelo_contrato_conteudo', 'modelo_contrato_conteudo_modelo_documento_fk');
    await queryInterface.removeConstraint('modelo_contrato_permanencia', 'modelo_contrato_permanencia_modelo_documento_fk');

    // Remover índices
    await queryInterface.removeIndex('modelo_termo_adesao', 'modelo_termo_adesao_modelo_documento_id');
    await queryInterface.removeIndex('modelo_contrato_conteudo', 'modelo_contrato_conteudo_modelo_documento_id');
    await queryInterface.removeIndex('modelo_contrato_permanencia', 'modelo_contrato_permanencia_modelo_documento_id');

    // Remover tabela modelo_documento
    await queryInterface.dropTable('modelo_documento');
  }
};

