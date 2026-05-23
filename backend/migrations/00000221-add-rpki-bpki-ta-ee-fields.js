'use strict';

/** BPKI estilo Krill: TA (identidade) + EE (CMS); ca_cert_pem continua sendo o EE. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('rpki_cas', 'bpki_ta_cert_pem', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
    });
    await queryInterface.addColumn('rpki_cas', 'bpki_ee_key_pem', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('rpki_cas', 'bpki_ee_key_pem');
    await queryInterface.removeColumn('rpki_cas', 'bpki_ta_cert_pem');
  },
};
