'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar se a coluna já existe antes de adicionar
    const tableDescription = await queryInterface.describeTable('carne_parcelas');
    
    if (!tableDescription.nosso_numero) {
      // Adicionar campo nosso_numero à tabela carne_parcelas
      await queryInterface.addColumn('carne_parcelas', 'nosso_numero', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Número do título gerado pelo nosso sistema'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Remover campo nosso_numero da tabela carne_parcelas
    await queryInterface.removeColumn('carne_parcelas', 'nosso_numero');
  }
};
