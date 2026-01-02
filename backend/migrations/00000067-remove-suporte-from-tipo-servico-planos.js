'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Atualizar registros existentes que têm 'suporte' para 'consultoria'
    await queryInterface.sequelize.query(`
      UPDATE planos 
      SET tipo_servico = 'consultoria' 
      WHERE tipo_servico = 'suporte'
    `);

    // No MySQL/MariaDB, alteramos o ENUM diretamente usando MODIFY COLUMN
    await queryInterface.sequelize.query(`
      ALTER TABLE planos 
      MODIFY COLUMN tipo_servico ENUM('infraestrutura', 'consultoria') 
      NOT NULL DEFAULT 'consultoria' 
      COMMENT 'Tipo de serviço do plano'
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Restaurar o valor 'suporte' no ENUM
    await queryInterface.sequelize.query(`
      ALTER TABLE planos 
      MODIFY COLUMN tipo_servico ENUM('suporte', 'infraestrutura', 'consultoria') 
      NOT NULL DEFAULT 'suporte' 
      COMMENT 'Tipo de serviço do plano'
    `);
  }
};

