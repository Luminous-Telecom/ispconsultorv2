'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('integracao_ixc_provedor');
    if (!table.cliente_id) {
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
    }

    const [indexes] = await queryInterface.sequelize.query(
      `SHOW INDEX FROM integracao_ixc_provedor WHERE Key_name = 'integracao_ixc_provedor_cliente_id_idx'`
    );
    if (!Array.isArray(indexes) || indexes.length === 0) {
      await queryInterface.addIndex('integracao_ixc_provedor', ['cliente_id'], {
        name: 'integracao_ixc_provedor_cliente_id_idx',
      });
    }

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
    await queryInterface
      .removeIndex('integracao_ixc_provedor', 'integracao_ixc_provedor_cliente_id_idx')
      .catch(() => undefined);
    const table = await queryInterface.describeTable('integracao_ixc_provedor');
    if (table.cliente_id) {
      await queryInterface.removeColumn('integracao_ixc_provedor', 'cliente_id');
    }
  },
};
