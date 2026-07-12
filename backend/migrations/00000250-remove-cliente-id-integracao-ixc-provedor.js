'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeIndex(
      'integracao_ixc_provedor',
      'integracao_ixc_provedor_cliente_id_idx'
    ).catch(() => undefined);
    await queryInterface.removeColumn('integracao_ixc_provedor', 'cliente_id');
  },

  async down(queryInterface, Sequelize) {
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
  },
};
