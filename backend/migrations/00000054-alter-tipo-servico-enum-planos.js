'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verificar se a coluna tipo_servico existe
    const [results] = await queryInterface.sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'planos' AND column_name = 'tipo_servico'
    `);

    const columnExists = results.length > 0;

    if (!columnExists) {
      // Se a coluna não existe, criar ela com o novo ENUM
      await queryInterface.addColumn('planos', 'tipo_servico', {
        type: Sequelize.ENUM('suporte', 'infraestrutura', 'consultoria'),
        allowNull: false,
        defaultValue: 'suporte',
        comment: 'Tipo de serviço do plano'
      });

      // Criar o índice
      await queryInterface.addIndex('planos', ['tipo_servico'], {
        name: 'planos_tipo_servico'
      });
    } else {
      // Se a coluna existe, atualizar os registros que têm os valores que serão removidos
      await queryInterface.sequelize.query(`
        UPDATE planos 
        SET tipo_servico = 'suporte' 
        WHERE tipo_servico IN ('internet', 'telefonia', 'tv', 'outros')
      `);

      // No MySQL/MariaDB, alteramos o ENUM diretamente usando MODIFY COLUMN
      await queryInterface.sequelize.query(`
        ALTER TABLE planos 
        MODIFY COLUMN tipo_servico ENUM('suporte', 'infraestrutura', 'consultoria') 
        NOT NULL DEFAULT 'suporte' 
        COMMENT 'Tipo de serviço do plano'
      `);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Restaurar os valores originais do ENUM
    // No MySQL/MariaDB, alteramos o ENUM diretamente usando MODIFY COLUMN
    await queryInterface.sequelize.query(`
      ALTER TABLE planos 
      MODIFY COLUMN tipo_servico ENUM('internet', 'telefonia', 'tv', 'suporte', 'infraestrutura', 'consultoria', 'outros') 
      NOT NULL DEFAULT 'internet' 
      COMMENT 'Tipo de serviço do plano'
    `);
  }
};

