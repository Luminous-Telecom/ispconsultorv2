'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remover foreign keys existentes
    await queryInterface.removeConstraint('carnes', 'carnes_cliente_id_foreign');
    await queryInterface.removeConstraint('carnes', 'carnes_plano_id_foreign');
    await queryInterface.removeConstraint('carnes', 'carnes_banco_id_foreign');
    await queryInterface.removeConstraint('carne_parcelas', 'carne_parcelas_carne_id_foreign');
    await queryInterface.removeConstraint('cliente_planos', 'cliente_planos_cliente_id_foreign');
    await queryInterface.removeConstraint('cliente_planos', 'cliente_planos_plano_id_foreign');
    await queryInterface.removeConstraint('banco_configuracoes', 'banco_configuracoes_banco_id_foreign');

    // Recriar foreign keys com RESTRICT
    await queryInterface.addConstraint('carnes', {
      fields: ['cliente_id'],
      type: 'foreign key',
      name: 'carnes_cliente_id_foreign',
      references: {
        table: 'clientes',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('carnes', {
      fields: ['plano_id'],
      type: 'foreign key',
      name: 'carnes_plano_id_foreign',
      references: {
        table: 'planos',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('carnes', {
      fields: ['banco_id'],
      type: 'foreign key',
      name: 'carnes_banco_id_foreign',
      references: {
        table: 'bancos',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('carne_parcelas', {
      fields: ['carne_id'],
      type: 'foreign key',
      name: 'carne_parcelas_carne_id_foreign',
      references: {
        table: 'carnes',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('cliente_planos', {
      fields: ['cliente_id'],
      type: 'foreign key',
      name: 'cliente_planos_cliente_id_foreign',
      references: {
        table: 'clientes',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('cliente_planos', {
      fields: ['plano_id'],
      type: 'foreign key',
      name: 'cliente_planos_plano_id_foreign',
      references: {
        table: 'planos',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('banco_configuracoes', {
      fields: ['banco_id'],
      type: 'foreign key',
      name: 'banco_configuracoes_banco_id_foreign',
      references: {
        table: 'bancos',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    // Reverter para CASCADE (não recomendado, mas para rollback)
    await queryInterface.removeConstraint('carnes', 'carnes_cliente_id_foreign');
    await queryInterface.removeConstraint('carnes', 'carnes_plano_id_foreign');
    await queryInterface.removeConstraint('carnes', 'carnes_banco_id_foreign');
    await queryInterface.removeConstraint('carne_parcelas', 'carne_parcelas_carne_id_foreign');
    await queryInterface.removeConstraint('cliente_planos', 'cliente_planos_cliente_id_foreign');
    await queryInterface.removeConstraint('cliente_planos', 'cliente_planos_plano_id_foreign');
    await queryInterface.removeConstraint('banco_configuracoes', 'banco_configuracoes_banco_id_foreign');

    // Recriar com CASCADE
    await queryInterface.addConstraint('carnes', {
      fields: ['cliente_id'],
      type: 'foreign key',
      name: 'carnes_cliente_id_foreign',
      references: {
        table: 'clientes',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('carnes', {
      fields: ['plano_id'],
      type: 'foreign key',
      name: 'carnes_plano_id_foreign',
      references: {
        table: 'planos',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('carnes', {
      fields: ['banco_id'],
      type: 'foreign key',
      name: 'carnes_banco_id_foreign',
      references: {
        table: 'bancos',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('carne_parcelas', {
      fields: ['carne_id'],
      type: 'foreign key',
      name: 'carne_parcelas_carne_id_foreign',
      references: {
        table: 'carnes',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('cliente_planos', {
      fields: ['cliente_id'],
      type: 'foreign key',
      name: 'cliente_planos_cliente_id_foreign',
      references: {
        table: 'clientes',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('cliente_planos', {
      fields: ['plano_id'],
      type: 'foreign key',
      name: 'cliente_planos_plano_id_foreign',
      references: {
        table: 'planos',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('banco_configuracoes', {
      fields: ['banco_id'],
      type: 'foreign key',
      name: 'banco_configuracoes_banco_id_foreign',
      references: {
        table: 'bancos',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  }
};
