'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('adm_contratos_integracao_ixc_vinculos', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      contrato_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'adm_contratos_contratos',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      integracao_ixc_provedor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'adm_integracao_ixc_provedor',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

    await queryInterface.addIndex(
      'adm_contratos_integracao_ixc_vinculos',
      ['contrato_id', 'integracao_ixc_provedor_id'],
      {
        unique: true,
        name: 'adm_contratos_ixc_vinculos_contrato_integracao_unique',
      }
    );

    await queryInterface.addIndex('adm_contratos_integracao_ixc_vinculos', ['contrato_id'], {
      name: 'adm_contratos_ixc_vinculos_contrato_id_idx',
    });

    await queryInterface.addIndex(
      'adm_contratos_integracao_ixc_vinculos',
      ['integracao_ixc_provedor_id'],
      {
        name: 'adm_contratos_ixc_vinculos_integracao_id_idx',
      }
    );

    const [contratosComIxc] = await queryInterface.sequelize.query(
      `SELECT id, empresa_id, integracao_ixc_provedor_id
       FROM adm_contratos_contratos
       WHERE integracao_ixc_provedor_id IS NOT NULL`
    );

    for (const row of contratosComIxc) {
      await queryInterface.bulkInsert('adm_contratos_integracao_ixc_vinculos', [
        {
          empresa_id: row.empresa_id,
          contrato_id: row.id,
          integracao_ixc_provedor_id: row.integracao_ixc_provedor_id,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
    }

    await queryInterface.removeColumn('adm_contratos_contratos', 'integracao_ixc_provedor_id');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('adm_contratos_contratos', 'integracao_ixc_provedor_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'adm_integracao_ixc_provedor',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    const [vinculos] = await queryInterface.sequelize.query(
      `SELECT contrato_id, integracao_ixc_provedor_id
       FROM adm_contratos_integracao_ixc_vinculos
       ORDER BY updated_at DESC`
    );

    const contratoIntegracao = new Map();
    for (const row of vinculos) {
      if (!contratoIntegracao.has(row.contrato_id)) {
        contratoIntegracao.set(row.contrato_id, row.integracao_ixc_provedor_id);
      }
    }

    for (const [contratoId, integracaoId] of contratoIntegracao.entries()) {
      await queryInterface.sequelize.query(
        'UPDATE adm_contratos_contratos SET integracao_ixc_provedor_id = ? WHERE id = ?',
        { replacements: [integracaoId, contratoId] }
      );
    }

    await queryInterface.dropTable('adm_contratos_integracao_ixc_vinculos');
  },
};
