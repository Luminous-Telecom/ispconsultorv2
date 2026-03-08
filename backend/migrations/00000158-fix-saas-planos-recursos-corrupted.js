'use strict';

/**
 * Corrige recursos corrompidos em saas_planos.
 * Dados corrompidos têm chaves numéricas "0","1","2"... (string tratada como índice).
 * Normaliza para { modulos: string[] } válido.
 */
function extractModulos(recursos) {
  if (!recursos || typeof recursos !== 'object') return [];
  const modulos = recursos.modulos;
  if (Array.isArray(modulos) && modulos.length > 0) {
    return modulos.filter((m) => typeof m === 'string');
  }
  return [];
}

function isCorrupted(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const numericKeys = Object.keys(obj).filter((k) => /^\d+$/.test(k));
  return numericKeys.length > 10;
}

module.exports = {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      `SELECT id, recursos FROM saas_planos`
    );

    for (const row of rows) {
      let parsed = row.recursos;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
          while (typeof parsed === 'string') parsed = JSON.parse(parsed);
        } catch {
          parsed = {};
        }
      }
      if (!parsed || typeof parsed !== 'object') parsed = {};

      const corrupted = isCorrupted(parsed);
      const modulos = extractModulos(parsed);

      const clean = { modulos: modulos.length > 0 ? modulos : ['cadastros', 'financeiro'] };

      await queryInterface.sequelize.query(
        `UPDATE saas_planos SET recursos = :recursos WHERE id = :id`,
        { replacements: { recursos: JSON.stringify(clean), id: row.id } }
      );
    }
  },

  async down() {
    // Não é possível reverter a correção
  },
};
