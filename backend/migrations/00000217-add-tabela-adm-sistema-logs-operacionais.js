'use strict';

/**
 * Coluna `tabela`: nome lógico/físico do registro afetado (ex.: entidade de auditoria ou tabela MySQL).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('adm_sistema_logs_operacionais', 'tabela', {
      type: Sequelize.STRING(120),
      allowNull: true,
      after: 'tipo',
    });
    await queryInterface.sequelize.query(
      'UPDATE adm_sistema_logs_operacionais SET tabela = recurso WHERE tabela IS NULL AND recurso IS NOT NULL'
    );
    await queryInterface.addIndex('adm_sistema_logs_operacionais', ['tabela', 'created_at'], {
      name: 'idx_adm_sistema_logs_op_tabela_created',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('adm_sistema_logs_operacionais', 'idx_adm_sistema_logs_op_tabela_created');
    await queryInterface.removeColumn('adm_sistema_logs_operacionais', 'tabela');
  },
};
