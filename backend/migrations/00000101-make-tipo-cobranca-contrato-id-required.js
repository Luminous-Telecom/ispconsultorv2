'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [tiposAtivosResult] = await queryInterface.sequelize.query(
      'SELECT id FROM tipos_cobranca_contrato WHERE ativo = 1 ORDER BY id ASC LIMIT 1'
    );
    let defaultTipoId = tiposAtivosResult?.[0]?.id ?? null;

    if (!defaultTipoId) {
      const [tiposQualquerResult] = await queryInterface.sequelize.query(
        'SELECT id FROM tipos_cobranca_contrato ORDER BY id ASC LIMIT 1'
      );
      defaultTipoId = tiposQualquerResult?.[0]?.id ?? null;
    }

    const [nullCountResult] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM contratos WHERE tipo_cobranca_contrato_id IS NULL'
    );
    const nullCount = nullCountResult?.[0]?.count ?? 0;

    if (nullCount > 0 && !defaultTipoId) {
      await queryInterface.sequelize.query(
        `INSERT INTO tipos_cobranca_contrato (nome, quantidade_titulos, periodicidade, ativo, created_at, updated_at)
         VALUES ('Padrão', 1, 'mensal', 1, NOW(), NOW())`
      );
      const [inserted] = await queryInterface.sequelize.query(
        'SELECT id FROM tipos_cobranca_contrato ORDER BY id DESC LIMIT 1'
      );
      defaultTipoId = inserted?.[0]?.id ?? null;
    }

    if (defaultTipoId) {
      await queryInterface.sequelize.query(
        `UPDATE contratos SET tipo_cobranca_contrato_id = ${defaultTipoId} WHERE tipo_cobranca_contrato_id IS NULL`
      );
    }

    await queryInterface.changeColumn('contratos', 'tipo_cobranca_contrato_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'tipos_cobranca_contrato',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('contratos', 'tipo_cobranca_contrato_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'tipos_cobranca_contrato',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  }
};
