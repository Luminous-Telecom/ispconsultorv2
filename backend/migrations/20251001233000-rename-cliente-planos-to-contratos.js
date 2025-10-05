'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Renomear a tabela cliente_planos para contratos
      await queryInterface.renameTable('cliente_planos', 'contratos', { transaction });
      
      await transaction.commit();
      console.log('✅ Tabela cliente_planos renomeada para contratos');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erro ao renomear tabela:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Reverter: renomear contratos para cliente_planos
      await queryInterface.renameTable('contratos', 'cliente_planos', { transaction });
      
      await transaction.commit();
      console.log('✅ Tabela contratos renomeada para cliente_planos');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erro ao reverter renomeação:', error);
      throw error;
    }
  }
};
