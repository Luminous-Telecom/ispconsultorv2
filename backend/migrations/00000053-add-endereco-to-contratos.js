'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('contratos', 'endereco', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Endereço do contrato'
    });
    
    await queryInterface.addColumn('contratos', 'numero', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Número do endereço do contrato'
    });
    
    await queryInterface.addColumn('contratos', 'complemento', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Complemento do endereço do contrato'
    });
    
    await queryInterface.addColumn('contratos', 'bairro', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Bairro do endereço do contrato'
    });
    
    await queryInterface.addColumn('contratos', 'cidade', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Cidade do endereço do contrato'
    });
    
    await queryInterface.addColumn('contratos', 'estado', {
      type: Sequelize.STRING(2),
      allowNull: true,
      comment: 'Estado do endereço do contrato'
    });
    
    await queryInterface.addColumn('contratos', 'usar_endereco_cliente', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Se verdadeiro, usa o endereço do cadastro do cliente'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('contratos', 'usar_endereco_cliente');
    await queryInterface.removeColumn('contratos', 'estado');
    await queryInterface.removeColumn('contratos', 'cidade');
    await queryInterface.removeColumn('contratos', 'bairro');
    await queryInterface.removeColumn('contratos', 'complemento');
    await queryInterface.removeColumn('contratos', 'numero');
    await queryInterface.removeColumn('contratos', 'endereco');
  }
};

