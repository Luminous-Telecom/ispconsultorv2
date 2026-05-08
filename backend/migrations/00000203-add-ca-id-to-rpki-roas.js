'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('rpki_roas', 'ca_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'rpki_cas', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addIndex('rpki_roas', ['ca_id'], { name: 'rpki_roas_ca_id' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('rpki_roas', 'rpki_roas_ca_id');
    await queryInterface.removeColumn('rpki_roas', 'ca_id');
  },
};

