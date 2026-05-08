'use strict';

// Alinha cron RPKI ao Krill (~24h parent; republish/repo check a cada 5 min).
// Só altera crons seeds antigos (não sobrescreve personalização).

// Evita substring */ no fonte JS (bloqueia parser de alguns loaders / erro em comentário).
const OLD_PARENT_CRON = '0 \u002a/6 * * *';
const NEW_PARENT_CRON = '0 3 * * *';
const OLD_REPO_CRON = '\u002a/10 * * * *';
const NEW_REPO_CRON = '\u002a/5 * * * *';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE saas_saas_scheduled_routines
       SET cron_expression = :novo, updated_at = NOW()
       WHERE tipo = 'rpki_sync_parent_resources'
         AND alvo = 'erp_global'
         AND cron_expression = :antigo`,
      { replacements: { novo: NEW_PARENT_CRON, antigo: OLD_PARENT_CRON } }
    );

    await queryInterface.sequelize.query(
      `UPDATE saas_saas_scheduled_routines
       SET cron_expression = :novo, updated_at = NOW()
       WHERE tipo = 'rpki_sync_repositories'
         AND alvo = 'erp_global'
         AND cron_expression = :antigo`,
      { replacements: { novo: NEW_REPO_CRON, antigo: OLD_REPO_CRON } }
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE saas_saas_scheduled_routines
       SET cron_expression = :antigo, updated_at = NOW()
       WHERE tipo = 'rpki_sync_parent_resources'
         AND alvo = 'erp_global'
         AND cron_expression = :novo`,
      { replacements: { novo: NEW_PARENT_CRON, antigo: OLD_PARENT_CRON } }
    );

    await queryInterface.sequelize.query(
      `UPDATE saas_saas_scheduled_routines
       SET cron_expression = :antigo, updated_at = NOW()
       WHERE tipo = 'rpki_sync_repositories'
         AND alvo = 'erp_global'
         AND cron_expression = :novo`,
      { replacements: { novo: NEW_REPO_CRON, antigo: OLD_REPO_CRON } }
    );
  },
};
