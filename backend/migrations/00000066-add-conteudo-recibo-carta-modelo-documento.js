'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Adicionar coluna conteudo_recibo
    await queryInterface.addColumn('modelo_documento', 'conteudo_recibo', {
      type: Sequelize.TEXT('long'),
      allowNull: true
    });

    // 2. Adicionar coluna conteudo_carta
    await queryInterface.addColumn('modelo_documento', 'conteudo_carta', {
      type: Sequelize.TEXT('long'),
      allowNull: true
    });

    // 3. Migrar recibos existentes para modelos de contrato
    // Buscar recibos que já foram migrados para modelo_documento (tipo='recibo')
    const [recibos] = await queryInterface.sequelize.query(`
      SELECT conteudo 
      FROM modelo_documento 
      WHERE tipo = 'recibo' AND ativo = true 
      ORDER BY id ASC 
      LIMIT 1
    `);

    if (recibos && recibos.length > 0 && recibos[0].conteudo) {
      const conteudoRecibo = recibos[0].conteudo;
      
      // Atualizar todos os modelos de contrato com o conteúdo do recibo
      await queryInterface.sequelize.query(`
        UPDATE modelo_documento 
        SET conteudo_recibo = ${queryInterface.sequelize.escape(conteudoRecibo)}
        WHERE tipo = 'contrato'
      `);
    }

    // 4. Migrar cartas de cobrança existentes para modelos de contrato
    // Buscar cartas que já foram migradas para modelo_documento (tipo='carta')
    const [cartas] = await queryInterface.sequelize.query(`
      SELECT conteudo 
      FROM modelo_documento 
      WHERE tipo = 'carta' AND ativo = true 
      ORDER BY id ASC 
      LIMIT 1
    `);

    if (cartas && cartas.length > 0 && cartas[0].conteudo) {
      const conteudoCarta = cartas[0].conteudo;
      
      // Atualizar todos os modelos de contrato com o conteúdo da carta
      await queryInterface.sequelize.query(`
        UPDATE modelo_documento 
        SET conteudo_carta = ${queryInterface.sequelize.escape(conteudoCarta)}
        WHERE tipo = 'contrato'
      `);
    }

    // 5. Remover os registros antigos de recibos e cartas após migração
    // Agora o conteúdo está armazenado dentro dos modelos de contrato
    await queryInterface.sequelize.query(`
      DELETE FROM modelo_documento 
      WHERE tipo = 'recibo'
    `);

    await queryInterface.sequelize.query(`
      DELETE FROM modelo_documento 
      WHERE tipo = 'carta'
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Remover as colunas na ordem reversa
    await queryInterface.removeColumn('modelo_documento', 'conteudo_carta');
    await queryInterface.removeColumn('modelo_documento', 'conteudo_recibo');
  }
};

