'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('rpki_cas', 'resource_cert_pem', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
    });
    await queryInterface.addColumn('rpki_cas', 'resource_key_pem', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
    });
    await queryInterface.addColumn('rpki_cas', 'resource_cert_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.addColumn('rpki_cas', 'resource_class_name', {
      type: Sequelize.STRING(120),
      allowNull: true,
    });
    await queryInterface.addColumn('rpki_cas', 'manifest_number', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('rpki_cas', 'crl_number', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('rpki_cas', 'crl_number');
    await queryInterface.removeColumn('rpki_cas', 'manifest_number');
    await queryInterface.removeColumn('rpki_cas', 'resource_class_name');
    await queryInterface.removeColumn('rpki_cas', 'resource_cert_url');
    await queryInterface.removeColumn('rpki_cas', 'resource_key_pem');
    await queryInterface.removeColumn('rpki_cas', 'resource_cert_pem');
  },
};
