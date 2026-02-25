'use strict';

module.exports = {
  up: async (queryInterface) => {
    const removeIfExists = async (table, indexName) => {
      try {
        await queryInterface.removeIndex(table, indexName);
      } catch (_e) {
        // índice pode não existir
      }
    };

    await removeIfExists('templates_whatsapp', 'templates_whatsapp_nome_idioma');
    await removeIfExists('templates_whatsapp', 'templates_whatsapp_nome_idioma_unique');

    // Remove duplicatas (mantém o de menor id por grupo nome+idioma)
    await queryInterface.sequelize.query(`
      DELETE t1 FROM templates_whatsapp t1
      INNER JOIN templates_whatsapp t2
        ON t1.nome = t2.nome AND t1.idioma = t2.idioma AND t1.id > t2.id
    `);

    await queryInterface.addIndex('templates_whatsapp', ['nome', 'idioma'], {
      unique: true,
      name: 'templates_whatsapp_nome_idioma_unique',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex(
      'templates_whatsapp',
      'templates_whatsapp_nome_idioma_unique'
    );
    await queryInterface.addIndex('templates_whatsapp', ['nome', 'idioma'], {
      name: 'templates_whatsapp_nome_idioma',
    });
  },
};
