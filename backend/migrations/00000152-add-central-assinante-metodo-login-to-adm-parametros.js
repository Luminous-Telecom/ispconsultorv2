'use strict';

/**
 * Alinha adm_parametros com saas_parametros: um único registro de config
 * com central_assinante_metodo_login como coluna (em vez de row key-value separada).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('adm_parametros');
    if (tableInfo.central_assinante_metodo_login) return;

    await queryInterface.addColumn('adm_parametros', 'central_assinante_metodo_login', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: 'cnpj'
    });

    // Migrar valor da row key-value para a row config (chave IS NULL)
    const [rows] = await queryInterface.sequelize.query(
      "SELECT valor FROM adm_parametros WHERE chave = 'central_assinante_metodo_login' LIMIT 1"
    );
    const valor = rows[0]?.valor || 'cnpj';

    await queryInterface.sequelize.query(
      `UPDATE adm_parametros SET central_assinante_metodo_login = ? WHERE chave IS NULL LIMIT 1`,
      { replacements: [valor] }
    );

    // Remover a row key-value duplicada
    await queryInterface.sequelize.query(
      "DELETE FROM adm_parametros WHERE chave = 'central_assinante_metodo_login'"
    );
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('adm_parametros');
    if (!tableInfo.central_assinante_metodo_login) return;

    // Recriar row key-value antes de remover coluna
    const [configRows] = await queryInterface.sequelize.query(
      "SELECT central_assinante_metodo_login FROM adm_parametros WHERE chave IS NULL LIMIT 1"
    );
    const valor = configRows[0]?.central_assinante_metodo_login || 'cnpj';

    await queryInterface.sequelize.query(
      `INSERT INTO adm_parametros (chave, valor, tipo, descricao, categoria, ativo, created_at, updated_at)
       VALUES ('central_assinante_metodo_login', ?, 'string', 'Método de login na central do assinante', 'central_assinante', 1, NOW(), NOW())`,
      { replacements: [valor] }
    );

    await queryInterface.removeColumn('adm_parametros', 'central_assinante_metodo_login');
  }
};
