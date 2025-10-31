'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('parametros', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      validar_cpf_cnpj: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      gerar_titulos_automatico: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      titulos_vence_sabado: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      auto_lancamento_titulos: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      total_titulos_financeiro: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 12
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Inserir registro padrão
    await new Promise(resolve => setTimeout(resolve, 100));
    await queryInterface.sequelize.query(
      'INSERT INTO parametros (validar_cpf_cnpj, gerar_titulos_automatico, titulos_vence_sabado, auto_lancamento_titulos, total_titulos_financeiro) VALUES (?, ?, ?, ?, ?)',
      {
        replacements: [true, false, false, false, 12]
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('parametros');
  }
};

