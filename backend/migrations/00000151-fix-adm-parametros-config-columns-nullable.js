'use strict';

/**
 * adm_parametros: linhas config (Parametros) não usam valor, tipo, descricao, etc.
 * Garante que essas colunas aceitem NULL para o INSERT do registro de config.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('adm_parametros');

    const fixes = [
      { col: 'valor', def: { type: Sequelize.TEXT, allowNull: true } },
      { col: 'tipo', def: { type: Sequelize.ENUM('string', 'number', 'boolean', 'json'), allowNull: true } },
      { col: 'descricao', def: { type: Sequelize.TEXT, allowNull: true } },
      { col: 'categoria', def: { type: Sequelize.STRING(50), allowNull: true } },
      { col: 'ativo', def: { type: Sequelize.BOOLEAN, allowNull: true } }
    ];

    for (const { col, def } of fixes) {
      if (tableInfo[col] && tableInfo[col].allowNull === false) {
        await queryInterface.changeColumn('adm_parametros', col, def);
      }
    }
  },

  async down() {
    // Não reverter - pode quebrar inserts de config
  }
};
