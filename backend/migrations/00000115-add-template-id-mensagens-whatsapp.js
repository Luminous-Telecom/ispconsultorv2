'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Adicionar coluna template_id
    await queryInterface.addColumn('mensagens_whatsapp', 'template_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'templates_whatsapp', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'FK para template cadastrado (WhatsApp Cloud API)'
    });

    await queryInterface.addIndex('mensagens_whatsapp', ['template_id']);

    // 2. Migrar template_mapping existentes para templates_whatsapp
    const [rows] = await queryInterface.sequelize.query(
      `SELECT id, empresa_id, template_mapping FROM mensagens_whatsapp WHERE template_mapping IS NOT NULL AND TRIM(template_mapping) != ''`
    );

    for (const row of rows) {
      try {
        let raw = String(row.template_mapping || '').trim();
        raw = raw.replace(/&quot;/g, '"').replace(/&#34;/g, '"');
        const parsed = JSON.parse(raw);
        const name = typeof parsed === 'string' ? parsed : (parsed.name || '');
        const language = typeof parsed === 'object' && parsed ? (parsed.language || 'pt_BR') : 'pt_BR';
        const variables = typeof parsed === 'object' && parsed && Array.isArray(parsed.variables)
          ? JSON.stringify(parsed.variables)
          : JSON.stringify(['cliente.razao_social', 'titulo.valor_final', 'titulo.data_vencimento', 'dias_vencimento']);
        const header_document = typeof parsed === 'object' && parsed && parsed.header_document === true;

        if (!name) continue;

        await queryInterface.sequelize.query(
          `INSERT INTO templates_whatsapp (empresa_id, nome, idioma, variables, header_document, ativo, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
          { replacements: [row.empresa_id, name, language, variables, header_document ? 1 : 0] }
        );
        const [[idRow]] = await queryInterface.sequelize.query('SELECT LAST_INSERT_ID() as id');
        const templateId = idRow?.id;

        if (templateId) {
          await queryInterface.sequelize.query(
            `UPDATE mensagens_whatsapp SET template_id = ? WHERE id = ?`,
            { replacements: [templateId, row.id] }
          );
        }
      } catch {
        // Ignora linhas com JSON inválido
      }
    }

    // 3. Remover coluna template_mapping
    await queryInterface.removeColumn('mensagens_whatsapp', 'template_mapping');
  },

  down: async (queryInterface, Sequelize) => {
    // Recriar template_mapping
    await queryInterface.addColumn('mensagens_whatsapp', 'template_mapping', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON com configuração do template (name, language, variables) para WhatsApp Cloud API'
    });

    // Restaurar dados do template para JSON
    const [rows] = await queryInterface.sequelize.query(
      `SELECT mw.id, tw.nome, tw.idioma, tw.variables, tw.header_document
       FROM mensagens_whatsapp mw
       JOIN templates_whatsapp tw ON mw.template_id = tw.id
       WHERE mw.template_id IS NOT NULL`
    );

    for (const row of rows) {
      const mapping = {
        name: row.nome,
        language: row.idioma,
        variables: row.variables ? JSON.parse(row.variables) : [],
        header_document: !!row.header_document
      };
      const json = JSON.stringify(mapping);
      await queryInterface.sequelize.query(
        `UPDATE mensagens_whatsapp SET template_mapping = ? WHERE id = ?`,
        { replacements: [json, row.id] }
      );
    }

    await queryInterface.removeColumn('mensagens_whatsapp', 'template_id');
  }
};
