'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
      // Verificar se a coluna contrato_id existe
      const tableDescription = await queryInterface.describeTable('titulos');
      
      if (!tableDescription.contrato_id) {
        console.log('Coluna contrato_id não existe, criando...');
        await queryInterface.addColumn('titulos', 'contrato_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'ID do contrato relacionado'
        });
      }

      // Verificar se a tabela contratos existe
      const tables = await queryInterface.showAllTables();
      if (!tables.includes('contratos')) {
        console.log('Tabela contratos não existe, pulando foreign key...');
        return;
      }

      // Adicionar foreign key constraint entre titulos e contratos
      await queryInterface.addConstraint('titulos', {
        fields: ['contrato_id'],
        type: 'foreign key',
        name: 'fk_titulos_contrato_id',
        references: {
          table: 'contratos',
          field: 'id'
        },
        onDelete: 'RESTRICT', // Impede deletar contrato se houver títulos vinculados
        onUpdate: 'CASCADE'
      });
      
      console.log('Foreign key criada com sucesso');
    } catch (error) {
      console.log('Erro ao criar foreign key:', error.message);
      // Não falha a migration se não conseguir criar a foreign key
    }
  },

  async down (queryInterface, Sequelize) {
    try {
      // Remover a foreign key constraint
      await queryInterface.removeConstraint('titulos', 'fk_titulos_contrato_id');
    } catch (error) {
      console.log('Erro ao remover foreign key:', error.message);
    }
  }
};