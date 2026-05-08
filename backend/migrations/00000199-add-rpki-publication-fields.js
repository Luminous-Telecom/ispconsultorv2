'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('rpki_ca_parents', 'publication_referrer', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.addColumn('rpki_ca_parents', 'publication_referral_token', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('rpki_repositories', 'publication_service_uri', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('rpki_repositories', 'publication_service_uri');
    await queryInterface.removeColumn('rpki_ca_parents', 'publication_referral_token');
    await queryInterface.removeColumn('rpki_ca_parents', 'publication_referrer');
  },
};
