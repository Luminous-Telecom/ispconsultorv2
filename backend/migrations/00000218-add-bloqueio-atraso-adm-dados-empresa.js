'use strict';

/**
 * Bloqueio por atraso de fatura SaaS é por tenant (adm_sistema_dados_empresa),
 * não na tabela saas_saas_dados_empresa (empresa operadora do SaaS).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'adm_sistema_dados_empresa';

    const desc = await queryInterface.describeTable(table);

    if (!desc.bloqueado_por_atraso) {
      await queryInterface.addColumn(table, 'bloqueado_por_atraso', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      await queryInterface.addIndex(table, ['bloqueado_por_atraso']);
    }

    if (!desc.data_fim_desbloqueio_manual) {
      await queryInterface.addColumn(table, 'data_fim_desbloqueio_manual', {
        type: Sequelize.DATEONLY,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down(queryInterface) {
    const table = 'adm_sistema_dados_empresa';
    const desc = await queryInterface.describeTable(table);

    if (desc.data_fim_desbloqueio_manual) {
      await queryInterface.removeColumn(table, 'data_fim_desbloqueio_manual');
    }
    if (desc.bloqueado_por_atraso) {
      await queryInterface.removeIndex(table, ['bloqueado_por_atraso']).catch(() => {});
      await queryInterface.removeColumn(table, 'bloqueado_por_atraso');
    }
  },
};
