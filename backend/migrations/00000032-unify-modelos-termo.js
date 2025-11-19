'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Atualizar ENUM do tipo para incluir tipo 'termo'
    await queryInterface.sequelize.query(`
      ALTER TABLE modelo_documento 
      MODIFY COLUMN tipo ENUM('contrato', 'recibo', 'carta', 'boleto', 'comprovante', 'outro', 'termo')
    `);

    // 2. Migrar dados de modelos_termo para modelo_documento (apenas se a tabela ainda existir)
    const [tables] = await queryInterface.sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'modelos_termo'
    `);
    
    if (tables.length > 0) {
      // Verificar se já existem dados migrados (verificando se há algum registro com tipo 'termo')
      const [existingData] = await queryInterface.sequelize.query(`
        SELECT COUNT(*) as count 
        FROM modelo_documento 
        WHERE tipo = 'termo'
      `);
      
      if (existingData[0].count === 0) {
        await queryInterface.sequelize.query(`
          INSERT INTO modelo_documento (
            nome,
            tipo,
            conteudo,
            descricao,
            ativo,
            tamanho_maximo,
            tipos_permitidos,
            retencao_dias,
            auto_backup,
            criptografia,
            created_at,
            updated_at
          )
          SELECT 
            nome,
            'termo' as tipo,
            conteudo,
            descricao,
            ativo,
            10485760 as tamanho_maximo,
            'pdf,doc,docx,xls,xlsx' as tipos_permitidos,
            365 as retencao_dias,
            false as auto_backup,
            false as criptografia,
            created_at,
            updated_at
          FROM modelos_termo
        `);
      }
    }

    // 3. Adicionar coluna modelo_documento_id em termos_contrato (se não existir)
    const termosTableDescription = await queryInterface.describeTable('termos_contrato');
    if (!termosTableDescription.modelo_documento_id) {
      await queryInterface.addColumn('termos_contrato', 'modelo_documento_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        after: termosTableDescription.modelo_termo_id ? 'modelo_termo_id' : 'contrato_id',
        references: {
          model: 'modelo_documento',
          key: 'id'
        }
      });
    }

    // 4. Atualizar termos_contrato para usar modelo_documento_id (mapeando pelo nome e tipo_termo)
    if (termosTableDescription.modelo_termo_id) {
      await queryInterface.sequelize.query(`
        UPDATE termos_contrato tc
        INNER JOIN modelos_termo mt ON mt.id = tc.modelo_termo_id
        INNER JOIN modelo_documento md ON md.nome = mt.nome AND md.tipo = mt.tipo_termo
        SET tc.modelo_documento_id = md.id
        WHERE tc.modelo_documento_id IS NULL
      `);
    }

    // 6. Remover coluna modelo_termo_id de termos_contrato (se ainda existir)
    if (termosTableDescription.modelo_termo_id) {
      await queryInterface.removeConstraint('termos_contrato', 'termos_contrato_ibfk_2').catch(() => {});
      await queryInterface.removeIndex('termos_contrato', 'termos_contrato_modelo_termo_id').catch(() => {});
      await queryInterface.removeColumn('termos_contrato', 'modelo_termo_id');
    }

    // 7. Adicionar índice para modelo_documento_id em termos_contrato (se não existir)
    const [indexes] = await queryInterface.sequelize.query(`
      SELECT INDEX_NAME 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'termos_contrato' 
      AND INDEX_NAME = 'termos_contrato_modelo_documento_id'
    `);
    
    if (indexes.length === 0) {
      await queryInterface.addIndex('termos_contrato', ['modelo_documento_id'], {
        name: 'termos_contrato_modelo_documento_id'
      });
    }

    // 8. Adicionar foreign key para modelo_documento_id em termos_contrato (se não existir)
    const [constraints] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'termos_contrato' 
      AND CONSTRAINT_NAME = 'termos_contrato_modelo_documento_fk'
    `);
    
    if (constraints.length === 0) {
      await queryInterface.addConstraint('termos_contrato', {
        fields: ['modelo_documento_id'],
        type: 'foreign key',
        name: 'termos_contrato_modelo_documento_fk',
        references: {
          table: 'modelo_documento',
          field: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }

    // 9. Remover tabela modelos_termo (se ainda existir)
    if (tables.length > 0) {
      await queryInterface.dropTable('modelos_termo');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Esta migration não pode ser revertida facilmente
    // pois os dados foram migrados para modelo_documento
    throw new Error('Migration cannot be reversed - data was migrated to modelo_documento');
  }
};

