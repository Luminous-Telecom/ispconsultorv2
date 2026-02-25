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
