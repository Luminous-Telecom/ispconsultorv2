'use strict';

const { QueryTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sequelize = queryInterface.sequelize;
    const dialect = sequelize.getDialect();

    const tableExists = async (name) => {
      const q =
        dialect === 'mysql'
          ? `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '${name}'`
          : `SELECT 1 FROM information_schema.tables WHERE table_name = '${name}'`;
      const r = await sequelize.query(q, { type: QueryTypes.SELECT });
      return Array.isArray(r) && r.length > 0;
    };

    if (!(await tableExists('versoes_blockdomi'))) {
      await queryInterface.createTable('versoes_blockdomi', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        numero: {
          type: Sequelize.STRING(12),
          allowNull: false,
          comment: 'YYYYMMDD + contador (ex: 2026021405)'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
      await queryInterface.addIndex('versoes_blockdomi', ['numero'], { unique: true });
    }

    if (!(await tableExists('operacoes_blockdomi'))) {
      await queryInterface.createTable('operacoes_blockdomi', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        tipo: {
          type: Sequelize.STRING(30),
          allowNull: false,
          comment: 'dominio_delete|ipv4_delete|ipv6_delete'
        },
        versao_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'versoes_blockdomi', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        quantidade: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1
        },
        ids_deletados: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Array de IDs deletados'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
      await queryInterface.addIndex('operacoes_blockdomi', ['tipo']);
      await queryInterface.addIndex('operacoes_blockdomi', ['created_at']);
    } else {
      const opsDesc = await queryInterface.describeTable('operacoes_blockdomi');
      if (!opsDesc.versao_id) {
        await queryInterface.addColumn('operacoes_blockdomi', 'versao_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'versoes_blockdomi', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });
      }
    }

    for (const table of ['dominios', 'ipv4', 'ipv6']) {
      const desc = await queryInterface.describeTable(table);
      if (!desc.versao_id) {
        await queryInterface.addColumn(table, 'versao_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'versoes_blockdomi', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('dominios', 'versao_id');
    await queryInterface.removeColumn('ipv4', 'versao_id');
    await queryInterface.removeColumn('ipv6', 'versao_id');
    await queryInterface.dropTable('operacoes_blockdomi');
    await queryInterface.dropTable('versoes_blockdomi');
  }
};
