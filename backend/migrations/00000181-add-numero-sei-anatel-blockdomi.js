'use strict';

/** Número SEI do protocolo eletrônico da Anatel (ofício / documento assinado). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('adm_dominios', 'numero_sei_anatel', {
      type: Sequelize.STRING(32),
      allowNull: true
    });
    await queryInterface.addColumn('adm_ipv4', 'numero_sei_anatel', {
      type: Sequelize.STRING(32),
      allowNull: true
    });
    await queryInterface.addColumn('adm_ipv6', 'numero_sei_anatel', {
      type: Sequelize.STRING(32),
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('adm_dominios', 'numero_sei_anatel');
    await queryInterface.removeColumn('adm_ipv4', 'numero_sei_anatel');
    await queryInterface.removeColumn('adm_ipv6', 'numero_sei_anatel');
  }
};
