'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('parametros').catch(() => null);

    if (!table || !table.chave) {
      // Estrutura não compatível, ignorar migration
      return;
    }

    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM parametros WHERE chave = 'central_assinante_metodo_login' LIMIT 1"
    );

    if (rows.length === 0) {
      await queryInterface.bulkInsert('parametros', [
        {
          chave: 'central_assinante_metodo_login',
          valor: 'cnpj',
          tipo: 'string',
          descricao: 'Método de login na central do assinante: "cnpj" ou "email"',
          categoria: 'central_assinante',
          ativo: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('parametros', {
      chave: 'central_assinante_metodo_login'
    });
  }
};
