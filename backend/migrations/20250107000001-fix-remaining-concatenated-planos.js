'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Atualizar planos que ainda têm informações concatenadas no nome_plano
    // Baseado na imagem mostrada pelo usuário
    
    console.log('🔧 Corrigindo dados concatenados restantes...');
    
    // Plano Básico Internet 100MB, 1 usuário
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'Plano Básico',
          descricao = 'Internet 100MB, 1 usuário',
          quantidade_usuarios = 1
      WHERE nome_plano LIKE '%Plano Básico%Internet%100MB%'
    `);

    // Plano Intermediário Internet 200MB, 3 usuários
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'Plano Intermediário',
          descricao = 'Internet 200MB, 3 usuários',
          quantidade_usuarios = 3
      WHERE nome_plano LIKE '%Plano Intermediário%Internet%200MB%'
    `);

    // Plano Avançado Internet 500MB, 5 usuários
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'Plano Avançado',
          descricao = 'Internet 500MB, 5 usuários',
          quantidade_usuarios = 5
      WHERE nome_plano LIKE '%Plano Avançado%Internet%500MB%'
    `);

    // Plano Premium Internet 1GB, 10 usuários
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'Plano Premium',
          descricao = 'Internet 1GB, 10 usuários',
          quantidade_usuarios = 10
      WHERE nome_plano LIKE '%Plano Premium%Internet%1GB%'
    `);

    // Plano Empresarial Internet 2GB, 20 usuários
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'Plano Empresarial',
          descricao = 'Internet 2GB, 20 usuários',
          quantidade_usuarios = 20
      WHERE nome_plano LIKE '%Plano Empresarial%Internet%2GB%'
    `);

    // Plano Corporativo Internet 5GB, 50 usuários
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'Plano Corporativo',
          descricao = 'Internet 5GB, 50 usuários',
          quantidade_usuarios = 50
      WHERE nome_plano LIKE '%Plano Corporativo%Internet%5GB%'
    `);

    // PLANO-FULL-CORE SERVIÇO DE CONSULTORIA APÓS 5000 CLIENTES
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'Plano Full Core',
          descricao = 'Serviço de consultoria após 5000 clientes',
          quantidade_usuarios = 1,
          tipo_servico = 'consultoria'
      WHERE nome_plano LIKE '%PLANO-FULL-CORE%'
    `);

    // PLANO-FULL-1200 SERVIÇO DE CONSULTORIA ATÉ 1200 CLIENTES
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'Plano Full 1200',
          descricao = 'Serviço de consultoria até 1200 clientes',
          quantidade_usuarios = 1200,
          tipo_servico = 'consultoria'
      WHERE nome_plano LIKE '%PLANO-FULL-1200%'
    `);

    // PLANO-START-1000 SERVIÇO DE CONSULTORIA ATÉ 1000 CLIENTES
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'Plano Start 1000',
          descricao = 'Serviço de consultoria até 1000 clientes',
          quantidade_usuarios = 1000,
          tipo_servico = 'consultoria'
      WHERE nome_plano LIKE '%PLANO-START-1000%'
    `);

    // PLANO-START-700 SERVIÇO DE CONSULTORIA ATÉ 700 CLIENTES
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'Plano Start 700',
          descricao = 'Serviço de consultoria até 700 clientes',
          quantidade_usuarios = 700,
          tipo_servico = 'consultoria'
      WHERE nome_plano LIKE '%PLANO-START-700%'
    `);

    // PLANO-SMART-400 SERVIÇO DE CONSULTORIA ATÉ 400 CLIENTES
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'Plano Smart 400',
          descricao = 'Serviço de consultoria até 400 clientes',
          quantidade_usuarios = 400,
          tipo_servico = 'consultoria'
      WHERE nome_plano LIKE '%PLANO-SMART-400%'
    `);

    // PLANO-SMART-300 SERVIÇO DE CONSULTORIA ATÉ 300 CLIENTES
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'Plano Smart 300',
          descricao = 'Serviço de consultoria até 300 clientes',
          quantidade_usuarios = 300,
          tipo_servico = 'consultoria'
      WHERE nome_plano LIKE '%PLANO-SMART-300%'
    `);

    console.log('✅ Dados dos planos corrigidos!');
  },

  async down(queryInterface, Sequelize) {
    // Reverter as alterações - concatenar novamente as informações
    
    // Plano Básico
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'Plano Básico Internet 100MB, 1 usuário',
          descricao = NULL,
          quantidade_usuarios = NULL
      WHERE nome_plano = 'Plano Básico'
    `);

    // Plano Intermediário
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'Plano Intermediário Internet 200MB, 3 usuários',
          descricao = NULL,
          quantidade_usuarios = NULL
      WHERE nome_plano = 'Plano Intermediário'
    `);

    // Plano Avançado
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'Plano Avançado Internet 500MB, 5 usuários',
          descricao = NULL,
          quantidade_usuarios = NULL
      WHERE nome_plano = 'Plano Avançado'
    `);

    // Plano Premium
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'Plano Premium Internet 1GB, 10 usuários',
          descricao = NULL,
          quantidade_usuarios = NULL
      WHERE nome_plano = 'Plano Premium'
    `);

    // Plano Empresarial
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'Plano Empresarial Internet 2GB, 20 usuários',
          descricao = NULL,
          quantidade_usuarios = NULL
      WHERE nome_plano = 'Plano Empresarial'
    `);

    // Plano Corporativo
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'Plano Corporativo Internet 5GB, 50 usuários',
          descricao = NULL,
          quantidade_usuarios = NULL
      WHERE nome_plano = 'Plano Corporativo'
    `);

    // PLANO-FULL-CORE
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'PLANO-FULL-CORE SERVIÇO DE CONSULTORIA APÓS 5000 CLIENTES',
          descricao = NULL,
          quantidade_usuarios = NULL,
          tipo_servico = 'internet'
      WHERE nome_plano = 'Plano Full Core'
    `);

    // PLANO-FULL-1200
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'PLANO-FULL-1200 SERVIÇO DE CONSULTORIA ATÉ 1200 CLIENTES',
          descricao = NULL,
          quantidade_usuarios = NULL,
          tipo_servico = 'internet'
      WHERE nome_plano = 'Plano Full 1200'
    `);

    // PLANO-START-1000
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'PLANO-START-1000 SERVIÇO DE CONSULTORIA ATÉ 1000 CLIENTES',
          descricao = NULL,
          quantidade_usuarios = NULL,
          tipo_servico = 'internet'
      WHERE nome_plano = 'Plano Start 1000'
    `);

    // PLANO-START-700
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'PLANO-START-700 SERVIÇO DE CONSULTORIA ATÉ 700 CLIENTES',
          descricao = NULL,
          quantidade_usuarios = NULL,
          tipo_servico = 'internet'
      WHERE nome_plano = 'Plano Start 700'
    `);

    // PLANO-SMART-400
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'PLANO-SMART-400 SERVIÇO DE CONSULTORIA ATÉ 400 CLIENTES',
          descricao = NULL,
          quantidade_usuarios = NULL,
          tipo_servico = 'internet'
      WHERE nome_plano = 'Plano Smart 400'
    `);

    // PLANO-SMART-300
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET nome_plano = 'PLANO-SMART-300 SERVIÇO DE CONSULTORIA ATÉ 300 CLIENTES',
          descricao = NULL,
          quantidade_usuarios = NULL,
          tipo_servico = 'internet'
      WHERE nome_plano = 'Plano Smart 300'
    `);

    console.log('✅ Dados dos planos revertidos!');
  }
};
