'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Preencher registros NULL com valor padrão
    await queryInterface.sequelize.query(`
      UPDATE clientes 
      SET valor_primeiro_titulo = 'total' 
      WHERE valor_primeiro_titulo IS NULL;
    `);

    // Alterar campo para NOT NULL
    await queryInterface.changeColumn('clientes', 'valor_primeiro_titulo', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'total',
      comment: 'Valor do primeiro título: total, proporcional ou valor numérico'
    });
  },

  async down(queryInterface, Sequelize) {
    // Reverter campo para nullable
    await queryInterface.changeColumn('clientes', 'valor_primeiro_titulo', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Valor do primeiro título: total, proporcional ou valor numérico'
    });
  }
};
