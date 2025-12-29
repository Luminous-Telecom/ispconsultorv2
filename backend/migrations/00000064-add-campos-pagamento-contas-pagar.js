'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('contas_pagar', 'linha_digitavel', {
      type: Sequelize.STRING(200),
      allowNull: true,
      comment: 'Linha digitável do boleto (quando tipo_pagamento = BOLETO)'
    });

    await queryInterface.addColumn('contas_pagar', 'tipo_chave_pix', {
      type: Sequelize.ENUM('CPF_CNPJ', 'CELULAR', 'EMAIL', 'ALEATORIA', 'QRCODE'),
      allowNull: true,
      comment: 'Tipo de chave PIX (quando tipo_pagamento = PIX)'
    });

    await queryInterface.addColumn('contas_pagar', 'chave_pix', {
      type: Sequelize.STRING(200),
      allowNull: true,
      comment: 'Chave PIX ou código copia e cola (quando tipo_pagamento = PIX)'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('contas_pagar', 'chave_pix');
    await queryInterface.removeColumn('contas_pagar', 'tipo_chave_pix');
    await queryInterface.removeColumn('contas_pagar', 'linha_digitavel');
    
    // Remover o ENUM se necessário
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_contas_pagar_tipo_chave_pix";');
  }
};

