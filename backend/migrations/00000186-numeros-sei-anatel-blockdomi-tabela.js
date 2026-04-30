'use strict';

const { QueryTypes } = require('sequelize');

/**
 * Normaliza o Nº SEI Anatel em tabela própria (adm_numeros_sei_anatel_blockdomi),
 * com vínculo por FK em adm_dominios / adm_ipv4 / adm_ipv6 — mesmo padrão de adm_versoes_blockdomi.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
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

    if (await tableExists('adm_numeros_sei_anatel_blockdomi')) {
      return;
    }

    await queryInterface.createTable('adm_numeros_sei_anatel_blockdomi', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      numero: {
        type: Sequelize.STRING(32),
        allowNull: false,
        comment: 'Número SEI Anatel (único por valor)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.addIndex('adm_numeros_sei_anatel_blockdomi', ['numero'], { unique: true, name: 'uniq_adm_numeros_sei_anatel_numero' });

    const descDom = await queryInterface.describeTable('adm_dominios');
    if (!descDom.numero_sei_anatel) {
      await queryInterface.addColumn('adm_dominios', 'numero_sei_anatel_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'adm_numeros_sei_anatel_blockdomi', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      await queryInterface.addColumn('adm_ipv4', 'numero_sei_anatel_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'adm_numeros_sei_anatel_blockdomi', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      await queryInterface.addColumn('adm_ipv6', 'numero_sei_anatel_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'adm_numeros_sei_anatel_blockdomi', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      return;
    }

    await sequelize.query(
      `INSERT INTO adm_numeros_sei_anatel_blockdomi (numero, created_at)
       SELECT DISTINCT TRIM(ns) AS numero, NOW()
       FROM (
         SELECT numero_sei_anatel AS ns FROM adm_dominios
         WHERE numero_sei_anatel IS NOT NULL AND TRIM(numero_sei_anatel) <> ''
         UNION
         SELECT numero_sei_anatel FROM adm_ipv4
         WHERE numero_sei_anatel IS NOT NULL AND TRIM(numero_sei_anatel) <> ''
         UNION
         SELECT numero_sei_anatel FROM adm_ipv6
         WHERE numero_sei_anatel IS NOT NULL AND TRIM(numero_sei_anatel) <> ''
       ) t
       WHERE TRIM(ns) <> ''`,
      { type: QueryTypes.INSERT }
    );

    await queryInterface.addColumn('adm_dominios', 'numero_sei_anatel_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'adm_numeros_sei_anatel_blockdomi', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addColumn('adm_ipv4', 'numero_sei_anatel_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'adm_numeros_sei_anatel_blockdomi', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addColumn('adm_ipv6', 'numero_sei_anatel_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'adm_numeros_sei_anatel_blockdomi', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await sequelize.query(
      `UPDATE adm_dominios d
       INNER JOIN adm_numeros_sei_anatel_blockdomi s ON TRIM(d.numero_sei_anatel) = s.numero
       SET d.numero_sei_anatel_id = s.id
       WHERE d.numero_sei_anatel IS NOT NULL AND TRIM(d.numero_sei_anatel) <> ''`,
      { type: QueryTypes.UPDATE }
    );
    await sequelize.query(
      `UPDATE adm_ipv4 d
       INNER JOIN adm_numeros_sei_anatel_blockdomi s ON TRIM(d.numero_sei_anatel) = s.numero
       SET d.numero_sei_anatel_id = s.id
       WHERE d.numero_sei_anatel IS NOT NULL AND TRIM(d.numero_sei_anatel) <> ''`,
      { type: QueryTypes.UPDATE }
    );
    await sequelize.query(
      `UPDATE adm_ipv6 d
       INNER JOIN adm_numeros_sei_anatel_blockdomi s ON TRIM(d.numero_sei_anatel) = s.numero
       SET d.numero_sei_anatel_id = s.id
       WHERE d.numero_sei_anatel IS NOT NULL AND TRIM(d.numero_sei_anatel) <> ''`,
      { type: QueryTypes.UPDATE }
    );

    await queryInterface.removeColumn('adm_dominios', 'numero_sei_anatel');
    await queryInterface.removeColumn('adm_ipv4', 'numero_sei_anatel');
    await queryInterface.removeColumn('adm_ipv6', 'numero_sei_anatel');
  },

  async down(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;

    await queryInterface.addColumn('adm_dominios', 'numero_sei_anatel', {
      type: Sequelize.STRING(32),
      allowNull: true
    });
    await queryInterface.addColumn('adm_ipv4', 'numero_sei_anatel', {
      type: Sequelize.STRING(32),
      allowNull: true
    });
    await queryInterface.addColumn('adm_ipv6', 'numero_sei_anatel', {
      type: Sequelize.STRING(32),
      allowNull: true
    });

    const descDom = await queryInterface.describeTable('adm_dominios');
    if (descDom.numero_sei_anatel_id) {
      await sequelize.query(
        `UPDATE adm_dominios d
         LEFT JOIN adm_numeros_sei_anatel_blockdomi s ON d.numero_sei_anatel_id = s.id
         SET d.numero_sei_anatel = s.numero`,
        { type: QueryTypes.UPDATE }
      );
    }
    const desc4 = await queryInterface.describeTable('adm_ipv4');
    if (desc4.numero_sei_anatel_id) {
      await sequelize.query(
        `UPDATE adm_ipv4 d
         LEFT JOIN adm_numeros_sei_anatel_blockdomi s ON d.numero_sei_anatel_id = s.id
         SET d.numero_sei_anatel = s.numero`,
        { type: QueryTypes.UPDATE }
      );
    }
    const desc6 = await queryInterface.describeTable('adm_ipv6');
    if (desc6.numero_sei_anatel_id) {
      await sequelize.query(
        `UPDATE adm_ipv6 d
         LEFT JOIN adm_numeros_sei_anatel_blockdomi s ON d.numero_sei_anatel_id = s.id
         SET d.numero_sei_anatel = s.numero`,
        { type: QueryTypes.UPDATE }
      );
    }

    await queryInterface.removeColumn('adm_dominios', 'numero_sei_anatel_id');
    await queryInterface.removeColumn('adm_ipv4', 'numero_sei_anatel_id');
    await queryInterface.removeColumn('adm_ipv6', 'numero_sei_anatel_id');
    await queryInterface.dropTable('adm_numeros_sei_anatel_blockdomi');
  }
};
