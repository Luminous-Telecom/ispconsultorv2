'use strict';

const FK_SPECS = [
  {
    table: 'ordens_servico',
    name: 'ordens_servico_empresa_id_fk',
    fields: ['empresa_id'],
    refTable: 'sistema_tenants',
    refField: 'id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'ordens_servico',
    name: 'ordens_servico_cliente_id_fk',
    fields: ['cliente_id'],
    refTable: 'clientes',
    refField: 'id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  {
    table: 'ordem_servico_arquivos',
    name: 'ordem_servico_arquivos_empresa_id_fk',
    fields: ['empresa_id'],
    refTable: 'sistema_tenants',
    refField: 'id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'ordens_servico_mensagens',
    name: 'ordens_servico_mensagens_empresa_id_fk',
    fields: ['empresa_id'],
    refTable: 'sistema_tenants',
    refField: 'id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'ordens_servico_mensagens',
    name: 'ordens_servico_mensagens_usuario_id_fk',
    fields: ['usuario_id'],
    refTable: 'cadastros_usuarios',
    refField: 'id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'integracao_ixc_provedor',
    name: 'integracao_ixc_provedor_empresa_id_fk',
    fields: ['empresa_id'],
    refTable: 'sistema_tenants',
    refField: 'id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'contratos_integracao_ixc_vinculos',
    name: 'contratos_integracao_ixc_vinculos_empresa_id_fk',
    fields: ['empresa_id'],
    refTable: 'sistema_tenants',
    refField: 'id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  {
    table: 'comunicacao_templates_whatsapp',
    name: 'comunicacao_templates_whatsapp_empresa_id_fk',
    fields: ['empresa_id'],
    refTable: 'sistema_tenants',
    refField: 'id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
];

const DUPLICATE_FKS = [
  { table: 'contratos', name: 'contratos_ibfk_5' },
  { table: 'contratos_termos', name: 'termos_contrato_modelo_documento_id_foreign_idx' },
];

async function addForeignKey(queryInterface, spec) {
  try {
    await queryInterface.addConstraint(spec.table, {
      fields: spec.fields,
      type: 'foreign key',
      name: spec.name,
      references: {
        table: spec.refTable,
        field: spec.refField,
      },
      onDelete: spec.onDelete,
      onUpdate: spec.onUpdate,
    });
  } catch (error) {
    const message = String(error?.message ?? error);
    const jaExiste =
      message.includes('Duplicate') ||
      message.includes('already exists') ||
      message.includes('ER_FK_DUP_NAME');
    if (!jaExiste) throw error;
  }
}

async function removeForeignKey(queryInterface, table, name) {
  try {
    await queryInterface.removeConstraint(table, name);
  } catch {
    // ignora se não existir
  }
}

module.exports = {
  up: async (queryInterface) => {
    for (const spec of FK_SPECS) {
      await addForeignKey(queryInterface, spec);
    }

    for (const { table, name } of DUPLICATE_FKS) {
      await removeForeignKey(queryInterface, table, name);
    }
  },

  down: async (queryInterface) => {
    for (const { table, name } of [...DUPLICATE_FKS].reverse()) {
      try {
        if (table === 'contratos' && name === 'contratos_ibfk_5') {
          await queryInterface.addConstraint('contratos', {
            fields: ['tipo_cobranca_contrato_id'],
            type: 'foreign key',
            name: 'contratos_ibfk_5',
            references: {
              table: 'cadastros_tipos_cobranca_contrato',
              field: 'id',
            },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          });
        } else if (table === 'contratos_termos' && name === 'termos_contrato_modelo_documento_id_foreign_idx') {
          await queryInterface.addConstraint('contratos_termos', {
            fields: ['modelo_documento_id'],
            type: 'foreign key',
            name: 'termos_contrato_modelo_documento_id_foreign_idx',
            references: {
              table: 'documentos_modelo',
              field: 'id',
            },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          });
        }
      } catch {
        // ignora se já existir
      }
    }

    for (const spec of [...FK_SPECS].reverse()) {
      await removeForeignKey(queryInterface, spec.table, spec.name);
    }
  },
};
