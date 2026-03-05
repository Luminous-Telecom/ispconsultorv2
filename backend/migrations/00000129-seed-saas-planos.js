'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('saas_planos', [
      {
        nome: 'Starter',
        descricao: 'Plano inicial para pequenas empresas',
        valor_mensal: 99.90,
        valor_anual: 999.00,
        limite_usuarios: 3,
        recursos: JSON.stringify({
          clientes: 100,
          contratos: true,
          financeiro: true,
          whatsapp: false,
          nfse: false,
          blockdomi: false,
          suporte: 'email',
        }),
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        nome: 'Professional',
        descricao: 'Plano completo para empresas em crescimento',
        valor_mensal: 199.90,
        valor_anual: 1999.00,
        limite_usuarios: 10,
        recursos: JSON.stringify({
          clientes: 500,
          contratos: true,
          financeiro: true,
          whatsapp: true,
          nfse: true,
          blockdomi: false,
          suporte: 'email+chat',
        }),
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        nome: 'Enterprise',
        descricao: 'Plano ilimitado para grandes operações',
        valor_mensal: 399.90,
        valor_anual: 3999.00,
        limite_usuarios: 50,
        recursos: JSON.stringify({
          clientes: -1,
          contratos: true,
          financeiro: true,
          whatsapp: true,
          nfse: true,
          blockdomi: true,
          suporte: 'prioritario',
        }),
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('saas_planos', null, {});
  },
};
