'use strict';

const fs = require('fs');
const path = require('path');

function readHotsiteHtmlFromRepoRoot() {
  // Este migration fica em backend/migrations, e o html está na raiz do repo: ../../html.html
  const htmlPath = path.resolve(__dirname, '..', '..', 'html.html');
  return fs.readFileSync(htmlPath, 'utf8');
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const html = readHotsiteHtmlFromRepoRoot();

    // Busca o último hotsite (se existir)
    const [rows] = await queryInterface.sequelize.query(
      'SELECT id FROM hotsites ORDER BY id DESC LIMIT 1'
    );

    const lastId = Array.isArray(rows) && rows[0] && rows[0].id ? Number(rows[0].id) : null;

    if (lastId) {
      await queryInterface.sequelize.query(
        'UPDATE hotsites SET html = ?, ativo = ?, updated_at = ? WHERE id = ?',
        { replacements: [html, true, Sequelize.literal('CURRENT_TIMESTAMP'), lastId] }
      );
      return;
    }

    // Se não existir nenhum registro, cria um novo
    await queryInterface.sequelize.query(
      'INSERT INTO hotsites (html, ativo, created_at, updated_at) VALUES (?, ?, ?, ?)',
      {
        replacements: [
          html,
          true,
          Sequelize.literal('CURRENT_TIMESTAMP'),
          Sequelize.literal('CURRENT_TIMESTAMP')
        ]
      }
    );
  },

  down: async (queryInterface) => {
    // Reversão conservadora: só limpa o HTML se o último registro ainda estiver igual ao arquivo.
    // (Assim não apaga alterações manuais feitas depois no painel.)
    const html = readHotsiteHtmlFromRepoRoot();

    const [rows] = await queryInterface.sequelize.query(
      'SELECT id, html FROM hotsites ORDER BY id DESC LIMIT 1'
    );

    const last = Array.isArray(rows) && rows[0] ? rows[0] : null;
    if (!last || !last.id) return;

    const currentHtml = typeof last.html === 'string' ? last.html : String(last.html ?? '');
    if (currentHtml !== html) return;

    await queryInterface.sequelize.query(
      'UPDATE hotsites SET html = ? WHERE id = ?',
      { replacements: ['', Number(last.id)] }
    );
  }
};

