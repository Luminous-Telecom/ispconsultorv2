'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Índices para melhorar performance de queries frequentes
    
    // 1. Índice para charge_id em titulos (usado em webhooks e busca por charge_id)
    await queryInterface.addIndex('titulos', ['charge_id'], {
      name: 'idx_titulos_charge_id',
      unique: false
    });

    // 2. Índice composto para status + data_vencimento em titulos (usado em relatórios e filtros)
    await queryInterface.addIndex('titulos', ['status', 'data_vencimento'], {
      name: 'idx_titulos_status_data_vencimento',
      unique: false
    });

    // 3. Índice composto para status + charge_id em titulos (usado em remessa bancária)
    await queryInterface.addIndex('titulos', ['status', 'charge_id'], {
      name: 'idx_titulos_status_charge_id',
      unique: false
    });

    // 4. Índice composto para contrato_id + status em titulos (usado em consultas de contratos)
    await queryInterface.addIndex('titulos', ['contrato_id', 'status'], {
      name: 'idx_titulos_contrato_status',
      unique: false
    });

    // 5. Índice para data_pagamento em titulos (usado em relatórios de pagamentos)
    await queryInterface.addIndex('titulos', ['data_pagamento'], {
      name: 'idx_titulos_data_pagamento',
      unique: false
    });

    // 6. Índice composto para status + pago em titulos (usado em filtros de dashboard)
    await queryInterface.addIndex('titulos', ['status', 'pago'], {
      name: 'idx_titulos_status_pago',
      unique: false
    });

    // 7. Índice composto para cliente_id + status em contratos (usado em consultas de clientes)
    await queryInterface.addIndex('contratos', ['cliente_id', 'status'], {
      name: 'idx_contratos_cliente_status',
      unique: false
    });

    // 8. Índice composto para status + data_inicio em contratos (usado em relatórios)
    await queryInterface.addIndex('contratos', ['status', 'data_inicio'], {
      name: 'idx_contratos_status_data_inicio',
      unique: false
    });

    // 9. Índice composto para conta_boleto + status em contratos (usado em scheduler)
    await queryInterface.addIndex('contratos', ['conta_boleto', 'status'], {
      name: 'idx_contratos_conta_boleto_status',
      unique: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remover índices na ordem inversa
    // 1. Remover foreign key que depende do índice
    await queryInterface.removeConstraint(
      'contratos',
      'contratos_ibfk_4'
    );

    // 2. Agora remover o índice
    await queryInterface.removeIndex(
      'contratos',
      'idx_contratos_conta_boleto_status'
    );

    await queryInterface.removeIndex('contratos', 'idx_contratos_status_data_inicio');
    await queryInterface.removeIndex('contratos', 'idx_contratos_cliente_status');
    await queryInterface.removeIndex('titulos', 'idx_titulos_status_pago');
    await queryInterface.removeIndex('titulos', 'idx_titulos_data_pagamento');
    await queryInterface.removeIndex('titulos', 'idx_titulos_contrato_status');
    await queryInterface.removeIndex('titulos', 'idx_titulos_status_charge_id');
    await queryInterface.removeIndex('titulos', 'idx_titulos_status_data_vencimento');
    await queryInterface.removeIndex('titulos', 'idx_titulos_charge_id');
  }
};

