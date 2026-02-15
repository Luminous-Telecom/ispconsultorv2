'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [tiposResult] = await queryInterface.sequelize.query(
      'SELECT id FROM tipos_cobranca_contrato WHERE ativo = 1 ORDER BY id ASC LIMIT 1'
    );
    const defaultTipoId = tiposResult && tiposResult[0] ? tiposResult[0].id : null;

    const [nullCountResult] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM contratos WHERE tipo_cobranca_contrato_id IS NULL'
    );
    const nullCount = nullCountResult?.[0]?.count ?? 0;

    if (nullCount > 0 && !defaultTipoId) {
      throw new Error('Existem contratos sem tipo de cobrança. Crie pelo menos um tipo de cobrança ativo antes de executar esta migration.');
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
