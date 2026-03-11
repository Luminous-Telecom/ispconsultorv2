'use strict';

/**
 * Remove tabela adm_parametro (key-value) — não utilizada.
 * Somente adm_parametros (config por empresa) é utilizada.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable('adm_parametro').catch(() => {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('adm_parametro', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      chave: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      valor: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      tipo: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      descricao: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      categoria: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  }
};
