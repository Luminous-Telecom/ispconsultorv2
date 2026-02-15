'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE planos 
      MODIFY COLUMN tipo_servico ENUM('infraestrutura', 'consultoria', 'blockdomi') 
      NOT NULL DEFAULT 'consultoria' 
      COMMENT 'Tipo de serviço do plano'
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      UPDATE planos SET tipo_servico = 'consultoria' WHERE tipo_servico = 'blockdomi'
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE planos 
      MODIFY COLUMN tipo_servico ENUM('infraestrutura', 'consultoria') 
      NOT NULL DEFAULT 'consultoria' 
      COMMENT 'Tipo de serviço do plano'
    `);
  }
};
