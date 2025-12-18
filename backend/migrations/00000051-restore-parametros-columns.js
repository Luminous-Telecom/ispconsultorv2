'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verificar e adicionar colunas que podem ter sido removidas pelo sync
    
    // Restaurar todas as colunas que podem ter sido removidas pelo sequelize.sync
    // Não usar 'after:' porque as colunas de referência podem não existir
    const columnsToCheck = [
      {
        name: 'validar_cpf_cnpj',
        definition: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        }
      },
      {
        name: 'validar_cep',
        definition: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        }
      },
      {
        name: 'titulos_vence_sabado',
        definition: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        }
      },
      {
        name: 'titulos_vence_domingo',
        definition: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        }
      },
      {
        name: 'auto_lancamento_titulos',
        definition: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        }
      },
      {
        name: 'total_titulos_financeiro',
        definition: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 12
        }
      }
    ];

    for (const column of columnsToCheck) {
      try {
        await queryInterface.addColumn('parametros', column.name, column.definition);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('Duplicate column') && 
            !errorMessage.includes('ER_DUP_FIELDNAME') && 
            !errorMessage.includes('1060')) {
          throw error;
        }
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Não remover as colunas no down, pois elas são necessárias
    // Apenas deixar como está
  }
};

