'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('planos');
    
    // Remover colunas relacionadas a velocidade/dados se existirem
    if (tableDescription.velocidade_download) {
      await queryInterface.removeColumn('planos', 'velocidade_download');
    }
    if (tableDescription.velocidade_upload) {
      await queryInterface.removeColumn('planos', 'velocidade_upload');
    }
    if (tableDescription.franquia_dados) {
      await queryInterface.removeColumn('planos', 'franquia_dados');
    }
    if (tableDescription.ilimitado) {
      await queryInterface.removeColumn('planos', 'ilimitado');
    }
    
    // Adicionar colunas para serviços
    if (!tableDescription.tipo_servico) {
      await queryInterface.addColumn('planos', 'tipo_servico', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'internet'
      });
    }
    
    if (!tableDescription.servicos_inclusos) {
      await queryInterface.addColumn('planos', 'servicos_inclusos', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
    
    if (!tableDescription.quantidade_usuarios) {
      await queryInterface.addColumn('planos', 'quantidade_usuarios', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }
    
    if (!tableDescription.periodicidade) {
      await queryInterface.addColumn('planos', 'periodicidade', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'mensal'
      });
    }
    
    if (!tableDescription.renovacao_automatica) {
      await queryInterface.addColumn('planos', 'renovacao_automatica', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('planos');
    
    // Remover colunas de serviços
    if (tableDescription.renovacao_automatica) {
      await queryInterface.removeColumn('planos', 'renovacao_automatica');
    }
    if (tableDescription.periodicidade) {
      await queryInterface.removeColumn('planos', 'periodicidade');
    }
    if (tableDescription.quantidade_usuarios) {
      await queryInterface.removeColumn('planos', 'quantidade_usuarios');
    }
    if (tableDescription.servicos_inclusos) {
      await queryInterface.removeColumn('planos', 'servicos_inclusos');
    }
    if (tableDescription.tipo_servico) {
      await queryInterface.removeColumn('planos', 'tipo_servico');
    }
    
    // Restaurar colunas originais
    await queryInterface.addColumn('planos', 'velocidade_download', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn('planos', 'velocidade_upload', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn('planos', 'franquia_dados', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn('planos', 'ilimitado', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  }
};