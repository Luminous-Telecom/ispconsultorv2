'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Adicionar campos que podem não existir ainda
    const tableDescription = await queryInterface.describeTable('carne_parcelas');
    
    if (!tableDescription.charge_id) {
      await queryInterface.addColumn('carne_parcelas', 'charge_id', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableDescription.url_boleto) {
      await queryInterface.addColumn('carne_parcelas', 'url_boleto', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableDescription.qrcode) {
      await queryInterface.addColumn('carne_parcelas', 'qrcode', {
        type: Sequelize.TEXT('long'),
        allowNull: true
      });
    }

    if (!tableDescription.qrcode_image) {
      await queryInterface.addColumn('carne_parcelas', 'qrcode_image', {
        type: Sequelize.TEXT('long'),
        allowNull: true
      });
    }

    if (!tableDescription.pago) {
      await queryInterface.addColumn('carne_parcelas', 'pago', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    if (!tableDescription.tipo) {
      await queryInterface.addColumn('carne_parcelas', 'tipo', {
        type: Sequelize.STRING(50),
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('carne_parcelas');
    
    if (tableDescription.tipo) {
      await queryInterface.removeColumn('carne_parcelas', 'tipo');
    }
    if (tableDescription.pago) {
      await queryInterface.removeColumn('carne_parcelas', 'pago');
    }
    if (tableDescription.qrcode_image) {
      await queryInterface.removeColumn('carne_parcelas', 'qrcode_image');
    }
    if (tableDescription.qrcode) {
      await queryInterface.removeColumn('carne_parcelas', 'qrcode');
    }
    if (tableDescription.url_boleto) {
      await queryInterface.removeColumn('carne_parcelas', 'url_boleto');
    }
    if (tableDescription.charge_id) {
      await queryInterface.removeColumn('carne_parcelas', 'charge_id');
    }
  }
};