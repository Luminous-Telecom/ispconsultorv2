'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('integracao_ixc_provedor', 'cliente_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'clientes',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.addIndex('integracao_ixc_provedor', ['cliente_id'], {
      name: 'integracao_ixc_provedor_cliente_id_idx',
    });

    await queryInterface.sequelize.query(`
      UPDATE integracao_ixc_provedor i
      INNER JOIN (
        SELECT
          v.integracao_ixc_provedor_id,
          MIN(c.cliente_id) AS cliente_id
        FROM contratos_integracao_ixc_vinculos v
        INNER JOIN contratos c ON c.id = v.contrato_id
        WHERE c.cliente_id IS NOT NULL
        GROUP BY v.integracao_ixc_provedor_id
      ) x ON x.integracao_ixc_provedor_id = i.id
      SET i.cliente_id = x.cliente_id
      WHERE i.cliente_id IS NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'integracao_ixc_provedor',
      'integracao_ixc_provedor_cliente_id_idx'
    );
    await queryInterface.removeColumn('integracao_ixc_provedor', 'cliente_id');
  },
};
