'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('rpki_published_objects', 'aspa_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'rpki_aspas', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      after: 'roa_id',
    });

    await queryInterface.changeColumn('rpki_published_objects', 'object_type', {
      type: Sequelize.ENUM('roa', 'mft', 'crl', 'cer', 'aspa'),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('rpki_published_objects', 'aspa_id');

    await queryInterface.changeColumn('rpki_published_objects', 'object_type', {
      type: Sequelize.ENUM('roa', 'mft', 'crl', 'cer'),
      allowNull: false,
    });
  },
};
