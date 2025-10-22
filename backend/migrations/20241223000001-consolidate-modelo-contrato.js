'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Adicionar novos campos à tabela modelo_contrato
    await queryInterface.addColumn('modelo_contrato', 'conteudo_adesao', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
      after: 'conteudo'
    });

    await queryInterface.addColumn('modelo_contrato', 'conteudo_permanencia', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
      after: 'conteudo_adesao'
    });

    // 2. Migrar dados das tabelas separadas para a tabela principal
    // Migrar de modelo_contrato_conteudo (se existir)
    const [modeloContratoConteudoExists] = await queryInterface.sequelize.query(
      "SHOW TABLES LIKE 'modelo_contrato_conteudo'"
    );
    if (modeloContratoConteudoExists.length > 0) {
      await queryInterface.sequelize.query(`
        UPDATE modelo_contrato mc
        INNER JOIN modelo_contrato_conteudo mcc ON mc.id = mcc.modelo_contrato_id
        SET mc.conteudo = mcc.modelo
        WHERE mcc.modelo IS NOT NULL AND mcc.modelo != ''
      `);
    }

    // Migrar de modelo_termo_adesao (se existir)
    const [modeloTermoAdesaoExists] = await queryInterface.sequelize.query(
      "SHOW TABLES LIKE 'modelo_termo_adesao'"
    );
    if (modeloTermoAdesaoExists.length > 0) {
      await queryInterface.sequelize.query(`
        UPDATE modelo_contrato mc
        INNER JOIN modelo_termo_adesao mta ON mc.id = mta.modelo_contrato_id
        SET mc.conteudo_adesao = mta.modelo
        WHERE mta.modelo IS NOT NULL AND mta.modelo != ''
      `);
    }

    // Migrar de modelo_contrato_permanencia (se existir)
    const [modeloContratoPermanenciaExists] = await queryInterface.sequelize.query(
      "SHOW TABLES LIKE 'modelo_contrato_permanencia'"
    );
    if (modeloContratoPermanenciaExists.length > 0) {
      await queryInterface.sequelize.query(`
        UPDATE modelo_contrato mc
        INNER JOIN modelo_contrato_permanencia mcp ON mc.id = mcp.modelo_contrato_id
        SET mc.conteudo_permanencia = mcp.modelo
        WHERE mcp.modelo IS NOT NULL AND mcp.modelo != ''
      `);
    }

    // 3. Remover tabelas antigas
    if (modeloContratoConteudoExists.length > 0) {
      await queryInterface.dropTable('modelo_contrato_conteudo');
    }
    if (modeloTermoAdesaoExists.length > 0) {
      await queryInterface.dropTable('modelo_termo_adesao');
    }
    if (modeloContratoPermanenciaExists.length > 0) {
      await queryInterface.dropTable('modelo_contrato_permanencia');
    }

    // 4. Remover tabelas com nomes antigos se existirem
    const [conteudoModeloContratoExists] = await queryInterface.sequelize.query(
      "SHOW TABLES LIKE 'conteudo_modelo_contrato'"
    );
    if (conteudoModeloContratoExists.length > 0) {
      await queryInterface.dropTable('conteudo_modelo_contrato');
    }

    const [conteudoTermoAdesaoExists] = await queryInterface.sequelize.query(
      "SHOW TABLES LIKE 'conteudo_termo_adesao'"
    );
    if (conteudoTermoAdesaoExists.length > 0) {
      await queryInterface.dropTable('conteudo_termo_adesao');
    }

    const [conteudoContratoPermanenciaExists] = await queryInterface.sequelize.query(
      "SHOW TABLES LIKE 'conteudo_contrato_permanencia'"
    );
    if (conteudoContratoPermanenciaExists.length > 0) {
      await queryInterface.dropTable('conteudo_contrato_permanencia');
    }
  },

  async down(queryInterface, Sequelize) {
    // Reverter: recriar tabelas separadas
    await queryInterface.createTable('modelo_contrato_conteudo', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      modelo_contrato_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'modelo_contrato',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      modelo: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('modelo_termo_adesao', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      modelo_contrato_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'modelo_contrato',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      modelo: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('modelo_contrato_permanencia', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      modelo_contrato_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'modelo_contrato',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      modelo: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Migrar dados de volta
    await queryInterface.sequelize.query(`
      INSERT INTO modelo_contrato_conteudo (modelo_contrato_id, modelo, created_at, updated_at)
      SELECT id, conteudo, created_at, updated_at
      FROM modelo_contrato
      WHERE conteudo IS NOT NULL AND conteudo != ''
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO modelo_termo_adesao (modelo_contrato_id, modelo, created_at, updated_at)
      SELECT id, conteudo_adesao, created_at, updated_at
      FROM modelo_contrato
      WHERE conteudo_adesao IS NOT NULL AND conteudo_adesao != ''
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO modelo_contrato_permanencia (modelo_contrato_id, modelo, created_at, updated_at)
      SELECT id, conteudo_permanencia, created_at, updated_at
      FROM modelo_contrato
      WHERE conteudo_permanencia IS NOT NULL AND conteudo_permanencia != ''
    `);

    // Remover colunas da tabela modelo_contrato
    await queryInterface.removeColumn('modelo_contrato', 'conteudo_permanencia');
    await queryInterface.removeColumn('modelo_contrato', 'conteudo_adesao');
  }
};

