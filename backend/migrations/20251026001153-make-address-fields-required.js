'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Primeiro, preencher campos vazios com valores padrão
    await queryInterface.sequelize.query(`
      UPDATE clientes 
      SET 
        cep = '00000-000' WHERE cep IS NULL OR cep = '';
    `);

    await queryInterface.sequelize.query(`
      UPDATE clientes 
      SET 
        endereco = 'Não informado' WHERE endereco IS NULL OR endereco = '';
    `);

    await queryInterface.sequelize.query(`
      UPDATE clientes 
      SET 
        numero = '0' WHERE numero IS NULL OR numero = '';
    `);

    await queryInterface.sequelize.query(`
      UPDATE clientes 
      SET 
        bairro = 'Não informado' WHERE bairro IS NULL OR bairro = '';
    `);

    await queryInterface.sequelize.query(`
      UPDATE clientes 
      SET 
        cidade = 'Não informado' WHERE cidade IS NULL OR cidade = '';
    `);

    await queryInterface.sequelize.query(`
      UPDATE clientes 
      SET 
        estado = 'XX' WHERE estado IS NULL OR estado = '';
    `);

    // Agora alterar os campos para NOT NULL
    await queryInterface.changeColumn('clientes', 'cep', {
      type: Sequelize.STRING(10),
      allowNull: false
    });

    await queryInterface.changeColumn('clientes', 'endereco', {
      type: Sequelize.STRING(255),
      allowNull: false
    });

    await queryInterface.changeColumn('clientes', 'numero', {
      type: Sequelize.STRING(10),
      allowNull: false
    });

    await queryInterface.changeColumn('clientes', 'bairro', {
      type: Sequelize.STRING(100),
      allowNull: false
    });

    await queryInterface.changeColumn('clientes', 'cidade', {
      type: Sequelize.STRING(100),
      allowNull: false
    });

    await queryInterface.changeColumn('clientes', 'estado', {
      type: Sequelize.STRING(2),
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    // Reverter os campos para nullable
    await queryInterface.changeColumn('clientes', 'cep', {
      type: Sequelize.STRING(10),
      allowNull: true
    });

    await queryInterface.changeColumn('clientes', 'endereco', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.changeColumn('clientes', 'numero', {
      type: Sequelize.STRING(10),
      allowNull: true
    });

    await queryInterface.changeColumn('clientes', 'bairro', {
      type: Sequelize.STRING(100),
      allowNull: true
    });

    await queryInterface.changeColumn('clientes', 'cidade', {
      type: Sequelize.STRING(100),
      allowNull: true
    });

    await queryInterface.changeColumn('clientes', 'estado', {
      type: Sequelize.STRING(2),
      allowNull: true
    });
  }
};
