'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
      // Verificar se a coluna existe antes de tentar remover
      const tableDescription = await queryInterface.describeTable('bancos');
      
      if (tableDescription.documento_cpf_cnpj) {
        console.log('Removendo coluna documento_cpf_cnpj da tabela bancos...');
        await queryInterface.removeColumn('bancos', 'documento_cpf_cnpj');
        console.log('Coluna documento_cpf_cnpj removida com sucesso');
      } else {
        console.log('Coluna documento_cpf_cnpj não existe, pulando...');
      }
    } catch (error) {
      console.log('Erro ao remover coluna documento_cpf_cnpj:', error.message);
      // Não falha a migration se a coluna não existir
    }
  },

  async down (queryInterface, Sequelize) {
    try {
      // Recriar a coluna caso seja necessário reverter
      console.log('Recriando coluna documento_cpf_cnpj na tabela bancos...');
      await queryInterface.addColumn('bancos', 'documento_cpf_cnpj', {
        type: Sequelize.STRING(18),
        allowNull: true,
        comment: 'CPF ou CNPJ do titular da conta'
      });
      console.log('Coluna documento_cpf_cnpj recriada com sucesso');
    } catch (error) {
      console.log('Erro ao recriar coluna documento_cpf_cnpj:', error.message);
    }
  }
};
