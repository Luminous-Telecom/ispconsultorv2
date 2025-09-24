'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('planos');
    
    // Remover relacionamento com cliente se existir
    if (tableDescription.cliente_id) {
      // Primeiro remover a foreign key constraint
      try {
        await queryInterface.removeConstraint('planos', 'planos_cliente_id_foreign');
      } catch (error) {
        // Constraint pode não existir ou ter nome diferente
        console.log('Constraint não encontrada ou já removida');
      }
      
      await queryInterface.removeColumn('planos', 'cliente_id');
    }
    
    // Adicionar campos de desconto
    if (!tableDescription.desconto_percentual) {
      await queryInterface.addColumn('planos', 'desconto_percentual', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0
      });
    }
    
    if (!tableDescription.desconto_valor) {
      await queryInterface.addColumn('planos', 'desconto_valor', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      });
    }
    
    if (!tableDescription.desconto_ativo) {
      await queryInterface.addColumn('planos', 'desconto_ativo', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('planos');
    
    // Remover campos de desconto
    if (tableDescription.desconto_ativo) {
      await queryInterface.removeColumn('planos', 'desconto_ativo');
    }
    if (tableDescription.desconto_valor) {
      await queryInterface.removeColumn('planos', 'desconto_valor');
    }
    if (tableDescription.desconto_percentual) {
      await queryInterface.removeColumn('planos', 'desconto_percentual');
    }
    
    // Restaurar relacionamento com cliente
    await queryInterface.addColumn('planos', 'cliente_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'clientes',
        key: 'id'
      },
      onDelete: 'CASCADE'
    });
  }
};