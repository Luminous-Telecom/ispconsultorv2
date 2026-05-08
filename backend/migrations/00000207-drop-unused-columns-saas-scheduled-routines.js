'use strict';

/**
 * Remove colunas não usadas pelo agendador SaaS (escopo por minuto/hora/dia_mes/mes/dia_semana).
 */

const TABLE = 'saas_saas_scheduled_routines';

module.exports = {
  async up(queryInterface) {
    const cols = ['id_tarefa', 'dia_execucao', 'descricao', 'configuracao', 'frequencia'];
    for (const col of cols) {
      await queryInterface.removeColumn(TABLE, col);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn(TABLE, 'descricao', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn(TABLE, 'configuracao', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: {}
    });
    await queryInterface.addColumn(TABLE, 'frequencia', {
      type: Sequelize.ENUM('diaria', 'semanal', 'mensal', 'anual', 'personalizada'),
      allowNull: false,
      defaultValue: 'personalizada'
    });
    await queryInterface.addColumn(TABLE, 'dia_execucao', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn(TABLE, 'id_tarefa', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  }
};
