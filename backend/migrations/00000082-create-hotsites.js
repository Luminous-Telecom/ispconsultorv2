'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('hotsites', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      html: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
        defaultValue: ''
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Migrar conteúdo antigo (se existir em parametros.chave = 'hotsite')
    try {
      const table = await queryInterface.describeTable('parametros');
      if (table && table.chave && table.valor) {
        const [rows] = await queryInterface.sequelize.query(
          'SELECT valor FROM parametros WHERE chave = ? ORDER BY id DESC LIMIT 1',
          { replacements: ['hotsite'] }
        );

        const valor = Array.isArray(rows) && rows[0] && rows[0].valor ? String(rows[0].valor) : '';

        await queryInterface.sequelize.query(
          'INSERT INTO hotsites (html, ativo) VALUES (?, ?)',
          { replacements: [valor, true] }
        );

        // Remover a configuração antiga para não manter duplicado
        await queryInterface.sequelize.query(
          'DELETE FROM parametros WHERE chave = ?',
          { replacements: ['hotsite'] }
        );
        return;
      }
    } catch (_e) {
      // Ignorar: tabela/colunas podem variar por ambiente
    }

    // Seed padrão (vazio) se não houve migração
    await queryInterface.sequelize.query(
      'INSERT INTO hotsites (html, ativo) VALUES (?, ?)',
      { replacements: ['', true] }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('hotsites');
  }
};

