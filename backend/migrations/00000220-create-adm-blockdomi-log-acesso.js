'use strict';

/**
 * Recria logs de acesso Blockdomi (API TXT + eventos de sistema) em MariaDB/MySQL.
 * Persistência anterior em Elasticsearch foi descontinuada para esta entidade.
 */

async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    { replacements: [tableName] }
  );
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await tableExists(queryInterface, 'adm_blockdomi_log_acesso')) {
      return;
    }
    await queryInterface.createTable('adm_blockdomi_log_acesso', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'adm_sistema_tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      ip: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      rota: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      metodo: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'GET',
      },
      status_http: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      sucesso: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      mensagem_erro: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('adm_blockdomi_log_acesso', ['created_at'], {
      name: 'adm_blockdomi_log_acesso_created_at_idx',
    });
    await queryInterface.addIndex('adm_blockdomi_log_acesso', ['empresa_id'], {
      name: 'adm_blockdomi_log_acesso_empresa_id_idx',
    });
    await queryInterface.addIndex('adm_blockdomi_log_acesso', ['rota'], {
      name: 'adm_blockdomi_log_acesso_rota_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('adm_blockdomi_log_acesso');
  },
};
