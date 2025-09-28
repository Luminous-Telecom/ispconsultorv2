'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar se o parâmetro já existe
    const existingParam = await queryInterface.rawSelect('parametros', {
      where: {
        chave: 'numero_parcelas_padrao'
      }
    }, ['id']);

    if (!existingParam) {
      await queryInterface.bulkInsert('parametros', [
        {
          chave: 'numero_parcelas_padrao',
          valor: '12',
          tipo: 'number',
          descricao: 'Número padrão de parcelas para auto geração',
          categoria: 'carne',
          ativo: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('parametros', {
      chave: 'numero_parcelas_padrao'
    });
  }
};