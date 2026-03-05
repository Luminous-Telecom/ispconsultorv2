'use strict';

/**
 * Separa adm_parametros em duas tabelas:
 * - adm_parametros: apenas config (validar_cpf_cnpj, etc) — uma linha por empresa
 * - adm_parametro: key-value (chave, valor, tipo, etc) — usado por Parametro
 * Remove colunas não usadas de adm_parametros.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Criar tabela adm_parametro para key-value
    const tableExists = await queryInterface
      .describeTable('adm_parametro')
      .then(() => true)
      .catch(() => false);

    if (!tableExists) {
      await queryInterface.createTable('adm_parametro', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        chave: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true
        },
        valor: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        tipo: {
          type: Sequelize.ENUM('string', 'number', 'boolean', 'json'),
          allowNull: false,
          defaultValue: 'string'
        },
        descricao: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        categoria: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'geral'
        },
        ativo: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        empresa_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false }
      });

      // 2. Migrar rows key-value (chave IS NOT NULL) para adm_parametro
      const [rows] = await queryInterface.sequelize.query(
        `SELECT id, chave, valor, tipo, descricao, categoria, ativo, empresa_id, created_at, updated_at 
         FROM adm_parametros WHERE chave IS NOT NULL`
      );

      if (rows.length > 0) {
        await queryInterface.bulkInsert(
          'adm_parametro',
          rows.map((r) => ({
            chave: r.chave,
            valor: r.valor || '',
            tipo: r.tipo || 'string',
            descricao: r.descricao || '',
            categoria: r.categoria || 'geral',
            ativo: r.ativo !== 0,
            empresa_id: r.empresa_id,
            created_at: r.created_at,
            updated_at: r.updated_at
          }))
        );
      }

      // 3. Remover rows key-value de adm_parametros
      await queryInterface.sequelize.query(
        "DELETE FROM adm_parametros WHERE chave IS NOT NULL"
      );
    }

    // 4. Remover colunas não usadas de adm_parametros
    const tableInfo = await queryInterface.describeTable('adm_parametros');
    const colsToRemove = ['chave', 'valor', 'tipo', 'descricao', 'categoria', 'ativo'];

    for (const col of colsToRemove) {
      if (tableInfo[col]) {
        await queryInterface.removeColumn('adm_parametros', col);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('adm_parametros');

    // 1. Re-adicionar colunas em adm_parametros
    if (!tableInfo.chave) {
      await queryInterface.addColumn('adm_parametros', 'chave', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
      await queryInterface.addColumn('adm_parametros', 'valor', {
        type: Sequelize.TEXT,
        allowNull: true
      });
      await queryInterface.addColumn('adm_parametros', 'tipo', {
        type: Sequelize.ENUM('string', 'number', 'boolean', 'json'),
        allowNull: true,
        defaultValue: 'string'
      });
      await queryInterface.addColumn('adm_parametros', 'descricao', {
        type: Sequelize.TEXT,
        allowNull: true
      });
      await queryInterface.addColumn('adm_parametros', 'categoria', {
        type: Sequelize.STRING(50),
        allowNull: true
      });
      await queryInterface.addColumn('adm_parametros', 'ativo', {
        type: Sequelize.BOOLEAN,
        allowNull: true
      });
    }

    // 2. Migrar dados de adm_parametro de volta para adm_parametros
    const [rows] = await queryInterface.sequelize.query(
      'SELECT chave, valor, tipo, descricao, categoria, ativo, empresa_id, created_at, updated_at FROM adm_parametro'
    );
    if (rows.length > 0) {
      for (const r of rows) {
        await queryInterface.sequelize.query(
          `INSERT INTO adm_parametros (chave, valor, tipo, descricao, categoria, ativo, empresa_id, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              r.chave,
              r.valor,
              r.tipo,
              r.descricao,
              r.categoria,
              r.ativo,
              r.empresa_id,
              r.created_at,
              r.updated_at
            ]
          }
        );
      }
    }

    // 3. Dropar adm_parametro
    await queryInterface.dropTable('adm_parametro').catch(() => {});
  }
};
