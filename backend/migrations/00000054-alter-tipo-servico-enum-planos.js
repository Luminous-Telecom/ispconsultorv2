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

      // Dropar o tipo ENUM existente e criar um novo com apenas os valores permitidos
      // No PostgreSQL, precisamos criar um novo tipo, alterar a coluna, e então dropar o antigo
      await queryInterface.sequelize.query(`
        CREATE TYPE "enum_planos_tipo_servico_new" AS ENUM ('suporte', 'infraestrutura', 'consultoria')
      `);

      await queryInterface.sequelize.query(`
        ALTER TABLE planos 
        ALTER COLUMN tipo_servico TYPE "enum_planos_tipo_servico_new" 
        USING tipo_servico::text::"enum_planos_tipo_servico_new"
      `);

      await queryInterface.sequelize.query(`
        DROP TYPE "enum_planos_tipo_servico"
      `);

      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_planos_tipo_servico_new" RENAME TO "enum_planos_tipo_servico"
      `);

      // Atualizar o valor padrão para 'suporte'
      await queryInterface.changeColumn('planos', 'tipo_servico', {
        type: Sequelize.ENUM('suporte', 'infraestrutura', 'consultoria'),
        allowNull: false,
        defaultValue: 'suporte',
        comment: 'Tipo de serviço do plano'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Restaurar os valores originais do ENUM
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_planos_tipo_servico_new" AS ENUM ('internet', 'telefonia', 'tv', 'suporte', 'infraestrutura', 'consultoria', 'outros')
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE planos 
      ALTER COLUMN tipo_servico TYPE "enum_planos_tipo_servico_new" 
      USING tipo_servico::text::"enum_planos_tipo_servico_new"
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE "enum_planos_tipo_servico"
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_planos_tipo_servico_new" RENAME TO "enum_planos_tipo_servico"
    `);

    await queryInterface.changeColumn('planos', 'tipo_servico', {
      type: Sequelize.ENUM('internet', 'telefonia', 'tv', 'suporte', 'infraestrutura', 'consultoria', 'outros'),
      allowNull: false,
      defaultValue: 'internet',
      comment: 'Tipo de serviço do plano'
    });
  }
};

