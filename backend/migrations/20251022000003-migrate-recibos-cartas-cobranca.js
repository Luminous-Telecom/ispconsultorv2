'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Migrar recibos existentes
    const recibosExistentes = await queryInterface.sequelize.query(
      `SELECT * FROM documentos_sistema WHERE tipo = 'recibo'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const recibo of recibosExistentes) {
      await queryInterface.bulkInsert('recibos', [{
        nome: recibo.nome,
        conteudo: recibo.conteudo,
        descricao: recibo.descricao,
        ativo: recibo.ativo,
        tamanho_maximo: recibo.tamanho_maximo,
        tipos_permitidos: recibo.tipos_permitidos,
        retencao_dias: recibo.retencao_dias,
        auto_backup: recibo.auto_backup,
        criptografia: recibo.criptografia,
        created_at: recibo.created_at,
        updated_at: recibo.updated_at
      }]);
    }

    // Migrar cartas de cobrança existentes
    const cartasExistentes = await queryInterface.sequelize.query(
      `SELECT * FROM documentos_sistema WHERE tipo = 'carta_cobranca'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const carta of cartasExistentes) {
      await queryInterface.bulkInsert('cartas_cobranca', [{
        nome: carta.nome,
        conteudo: carta.conteudo,
        descricao: carta.descricao,
        ativo: carta.ativo,
        tamanho_maximo: carta.tamanho_maximo,
        tipos_permitidos: carta.tipos_permitidos,
        retencao_dias: carta.retencao_dias,
        auto_backup: carta.auto_backup,
        criptografia: carta.criptografia,
        created_at: carta.created_at,
        updated_at: carta.updated_at
      }]);
    }

    // Remover registros migrados da tabela documentos_sistema
    await queryInterface.bulkDelete('documentos_sistema', {
      tipo: ['recibo', 'carta_cobranca']
    });

    // Atualizar constraint da tabela documentos_sistema para remover os tipos migrados
    await queryInterface.changeColumn('documentos_sistema', 'tipo', {
      type: Sequelize.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        isIn: [['contrato', 'boleto', 'comprovante', 'outro']],
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Restaurar constraint original
    await queryInterface.changeColumn('documentos_sistema', 'tipo', {
      type: Sequelize.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        isIn: [['contrato', 'recibo', 'carta_cobranca', 'boleto', 'comprovante', 'outro']],
      },
    });

    // Migrar dados de volta para documentos_sistema
    const recibos = await queryInterface.sequelize.query(
      `SELECT * FROM recibos`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const recibo of recibos) {
      await queryInterface.bulkInsert('documentos_sistema', [{
        nome: recibo.nome,
        tipo: 'recibo',
        conteudo: recibo.conteudo,
        descricao: recibo.descricao,
        ativo: recibo.ativo,
        tamanho_maximo: recibo.tamanho_maximo,
        tipos_permitidos: recibo.tipos_permitidos,
        retencao_dias: recibo.retencao_dias,
        auto_backup: recibo.auto_backup,
        criptografia: recibo.criptografia,
        created_at: recibo.created_at,
        updated_at: recibo.updated_at
      }]);
    }

    const cartas = await queryInterface.sequelize.query(
      `SELECT * FROM cartas_cobranca`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const carta of cartas) {
      await queryInterface.bulkInsert('documentos_sistema', [{
        nome: carta.nome,
        tipo: 'carta_cobranca',
        conteudo: carta.conteudo,
        descricao: carta.descricao,
        ativo: carta.ativo,
        tamanho_maximo: carta.tamanho_maximo,
        tipos_permitidos: carta.tipos_permitidos,
        retencao_dias: carta.retencao_dias,
        auto_backup: carta.auto_backup,
        criptografia: carta.criptografia,
        created_at: carta.created_at,
        updated_at: carta.updated_at
      }]);
    }

    // Remover as novas tabelas
    await queryInterface.dropTable('recibos');
    await queryInterface.dropTable('cartas_cobranca');
  }
};
