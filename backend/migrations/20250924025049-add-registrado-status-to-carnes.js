'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Adicionar o novo valor 'registrado' ao ENUM do campo status
    await queryInterface.sequelize.query(`
      ALTER TABLE carnes 
      MODIFY COLUMN status ENUM('ativo', 'pago', 'cancelado', 'parcial', 'pendente', 'registrado') 
      NOT NULL DEFAULT 'ativo';
    `);
  },

  async down (queryInterface, Sequelize) {
    // Remover o valor 'registrado' do ENUM do campo status
    await queryInterface.sequelize.query(`
      ALTER TABLE carnes 
      MODIFY COLUMN status ENUM('ativo', 'pago', 'cancelado', 'parcial', 'pendente') 
      NOT NULL DEFAULT 'ativo';
    `);
  }
};
