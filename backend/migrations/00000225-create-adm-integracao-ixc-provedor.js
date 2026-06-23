'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('adm_integracao_ixc_provedor', {
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
      nome: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      api_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      api_token: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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

    const [oldRows] = await queryInterface.sequelize.query(
      'SELECT * FROM adm_contratos_integracao_ixc'
    );

    for (const row of oldRows) {
      if (!row.api_url && !row.api_token) continue;

      await queryInterface.bulkInsert('adm_integracao_ixc_provedor', [
        {
          empresa_id: row.empresa_id,
          nome: `IXC Contrato ${row.contrato_id}`,
          api_url: row.api_url,
          api_token: row.api_token,
          ativo: row.ativo ? 1 : 0,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
      ]);

      const [[inserted]] = await queryInterface.sequelize.query(
        `SELECT id FROM adm_integracao_ixc_provedor
         WHERE nome = ? AND empresa_id <=> ?
         ORDER BY id DESC LIMIT 1`,
        { replacements: [`IXC Contrato ${row.contrato_id}`, row.empresa_id] }
      );

      if (inserted?.id) {
        await queryInterface.sequelize.query(
          'UPDATE adm_contratos_contratos SET integracao_ixc_provedor_id = ? WHERE id = ?',
          { replacements: [inserted.id, row.contrato_id] }
        );
      }
    }

    await queryInterface.dropTable('adm_contratos_integracao_ixc');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('adm_contratos_integracao_ixc', {
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
        unique: true,
        references: {
          model: 'adm_contratos_contratos',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      api_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      api_token: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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

    await queryInterface.removeColumn('adm_contratos_contratos', 'integracao_ixc_provedor_id');
    await queryInterface.dropTable('adm_integracao_ixc_provedor');
  },
};
