'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Atualizando dados dos planos sem deletar...');
    
    // Atualizar cada plano individualmente
    const planosData = [
      { id: 1, nome: 'Plano Básico', desc: 'Internet 100MB, 1 usuário', users: 1, valor: 89.90, tipo: 'internet' },
      { id: 2, nome: 'Plano Intermediário', desc: 'Internet 200MB, 3 usuários', users: 3, valor: 149.90, tipo: 'internet' },
      { id: 3, nome: 'Plano Avançado', desc: 'Internet 500MB, 5 usuários', users: 5, valor: 249.90, tipo: 'internet' },
      { id: 4, nome: 'Plano Premium', desc: 'Internet 1GB, 10 usuários', users: 10, valor: 399.90, tipo: 'internet' },
      { id: 5, nome: 'Plano Empresarial', desc: 'Internet 2GB, 20 usuários', users: 20, valor: 699.90, tipo: 'internet' },
      { id: 6, nome: 'Plano Corporativo', desc: 'Internet 5GB, 50 usuários', users: 50, valor: 1299.90, tipo: 'internet' },
      { id: 7, nome: 'Plano Full Core', desc: 'Serviço de consultoria após 5000 clientes', users: 1, valor: 1518.00, tipo: 'consultoria' },
      { id: 8, nome: 'Plano Full 1200', desc: 'Serviço de consultoria até 1200 clientes', users: 1200, valor: 700.00, tipo: 'consultoria' },
      { id: 9, nome: 'Plano Start 1000', desc: 'Serviço de consultoria até 1000 clientes', users: 1000, valor: 600.00, tipo: 'consultoria' },
      { id: 10, nome: 'Plano Start 700', desc: 'Serviço de consultoria até 700 clientes', users: 700, valor: 500.00, tipo: 'consultoria' },
      { id: 11, nome: 'Plano Smart 400', desc: 'Serviço de consultoria até 400 clientes', users: 400, valor: 400.00, tipo: 'consultoria' },
      { id: 12, nome: 'Plano Smart 300', desc: 'Serviço de consultoria até 300 clientes', users: 300, valor: 300.00, tipo: 'consultoria' }
    ];
    
    for (const plano of planosData) {
      await queryInterface.sequelize.query(`
        UPDATE planos 
        SET nome_plano = '${plano.nome}',
            descricao = '${plano.desc}',
            quantidade_usuarios = ${plano.users},
            valor_mensal = ${plano.valor},
            tipo_servico = '${plano.tipo}',
            updated_at = NOW()
        WHERE id = ${plano.id}
      `);
      console.log(`✅ Atualizado: ${plano.nome}`);
    }
    
    console.log('✅ Todos os planos foram atualizados!');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Revertendo dados dos planos...');
    
    // Reverter para dados concatenados
    const planosData = [
      { id: 1, nome: 'Plano Básico Internet 100MB, 1 usuário', desc: null, users: null, valor: 89.90, tipo: 'internet' },
      { id: 2, nome: 'Plano Intermediário Internet 200MB, 3 usuários', desc: null, users: null, valor: 149.90, tipo: 'internet' },
      { id: 3, nome: 'Plano Avançado Internet 500MB, 5 usuários', desc: null, users: null, valor: 249.90, tipo: 'internet' },
      { id: 4, nome: 'Plano Premium Internet 1GB, 10 usuários', desc: null, users: null, valor: 399.90, tipo: 'internet' },
      { id: 5, nome: 'Plano Empresarial Internet 2GB, 20 usuários', desc: null, users: null, valor: 699.90, tipo: 'internet' },
      { id: 6, nome: 'Plano Corporativo Internet 5GB, 50 usuários', desc: null, users: null, valor: 1299.90, tipo: 'internet' },
      { id: 7, nome: 'PLANO-FULL-CORE SERVIÇO DE CONSULTORIA APÓS 5000 CLIENTES', desc: null, users: null, valor: 1518.00, tipo: 'internet' },
      { id: 8, nome: 'PLANO-FULL-1200 SERVIÇO DE CONSULTORIA ATÉ 1200 CLIENTES', desc: null, users: null, valor: 700.00, tipo: 'internet' },
      { id: 9, nome: 'PLANO-START-1000 SERVIÇO DE CONSULTORIA ATÉ 1000 CLIENTES', desc: null, users: null, valor: 600.00, tipo: 'internet' },
      { id: 10, nome: 'PLANO-START-700 SERVIÇO DE CONSULTORIA ATÉ 700 CLIENTES', desc: null, users: null, valor: 500.00, tipo: 'internet' },
      { id: 11, nome: 'PLANO-SMART-400 SERVIÇO DE CONSULTORIA ATÉ 400 CLIENTES', desc: null, users: null, valor: 400.00, tipo: 'internet' },
      { id: 12, nome: 'PLANO-SMART-300 SERVIÇO DE CONSULTORIA ATÉ 300 CLIENTES', desc: null, users: null, valor: 300.00, tipo: 'internet' }
    ];
    
    for (const plano of planosData) {
      await queryInterface.sequelize.query(`
        UPDATE planos 
        SET nome_plano = '${plano.nome}',
            descricao = ${plano.desc ? `'${plano.desc}'` : 'NULL'},
            quantidade_usuarios = ${plano.users || 'NULL'},
            valor_mensal = ${plano.valor},
            tipo_servico = '${plano.tipo}',
            updated_at = NOW()
        WHERE id = ${plano.id}
      `);
      console.log(`✅ Revertido: ${plano.nome}`);
    }
    
    console.log('✅ Dados revertidos!');
  }
};
