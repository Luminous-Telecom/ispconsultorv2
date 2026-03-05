'use strict';

/**
 * Tabela saas_parametros - Recursos do Sistema isolados para SaaS (igual parametros do admin)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('saas_parametros', {
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
      validar_cep: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      titulos_vence_sabado: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      titulos_vence_domingo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      central_assinante_metodo_login: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'cnpj'
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
    await queryInterface.sequelize.query(
      "INSERT INTO saas_parametros (validar_cpf_cnpj, validar_cep, titulos_vence_sabado, titulos_vence_domingo, central_assinante_metodo_login) VALUES (1, 0, 0, 0, 'cnpj')"
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('saas_parametros');
  }
};
