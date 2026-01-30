'use strict';

module.exports = {
  up: async (queryInterface) => {
    const removeIfExists = async (table, name) => {
      try {
        await queryInterface.removeIndex(table, name);
      } catch (_e) {
        // índice pode não existir ou ter outro nome
      }
    };
    const addUniqueIfPossible = async (table, column, indexName) => {
      try {
        await queryInterface.addIndex(table, [column], { unique: true, name: indexName });
      } catch (e) {
        // Se já existir duplicatas no banco, o índice unique falha; validação no backend evita novos duplicados
        if (e.name !== 'SequelizeDatabaseError' && e.original?.code !== 'ER_DUP_ENTRY') {
          throw e;
        }
      }
    };

    await removeIfExists('dominios', 'dominio');
    await removeIfExists('dominios', 'dominios_dominio');
    await addUniqueIfPossible('dominios', 'dominio', 'dominios_dominio_unique');

    await removeIfExists('ipv4', 'ip');
    await removeIfExists('ipv4', 'ipv4_ip');
    await addUniqueIfPossible('ipv4', 'ip', 'ipv4_ip_unique');

    await removeIfExists('ipv6', 'ip');
    await removeIfExists('ipv6', 'ipv6_ip');
    await addUniqueIfPossible('ipv6', 'ip', 'ipv6_ip_unique');
  },

  down: async (queryInterface) => {
    const removeIfExists = async (table, name) => {
      try {
        await queryInterface.removeIndex(table, name);
      } catch (_e) {}
    };
    await removeIfExists('dominios', 'dominios_dominio_unique');
    await queryInterface.addIndex('dominios', ['dominio']);
    await removeIfExists('ipv4', 'ipv4_ip_unique');
    await queryInterface.addIndex('ipv4', ['ip']);
    await removeIfExists('ipv6', 'ipv6_ip_unique');
    await queryInterface.addIndex('ipv6', ['ip']);
  }
};
