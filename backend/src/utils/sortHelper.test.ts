import { SortHelper } from './sortHelper';

const config = {
  model: {
    rawAttributes: {
      nome: { allowNull: false },
      cidade: { allowNull: true },
    },
  },
  tableName: 'clientes',
  virtualColumns: {
    valor_aberto: { sql: 'valor - pago', description: 'em aberto' },
  },
  relationshipColumns: {
    cliente: { association: 'cliente', field: 'razao_social', description: 'cliente' },
  },
};

describe('SortHelper — visualização ordenada', () => {
  it('aceita coluna do model, virtual e de relacionamento', () => {
    expect(SortHelper.validateColumn(config, 'nome')).toMatchObject({ isValid: true, isNullable: false });
    expect(SortHelper.validateColumn(config, 'valor_aberto').isVirtual).toBe(true);
    expect(SortHelper.validateColumn(config, 'cliente').isRelationship).toBe(true);
    expect(SortHelper.validateColumn(config, 'senha').isValid).toBe(false);
  });

  it('recusa ordenar por coluna inexistente', () => {
    const result = SortHelper.buildOrder(config, 'senha', 'ASC');
    expect(result.isValid).toBe(false);
    expect(result.order).toEqual([]);
  });

  it('monta ordem de relacionamento sem interpolar a direção fora de ASC/DESC', () => {
    const result = SortHelper.buildOrder(config, 'cliente', 'DESC');
    expect(result.isValid).toBe(true);
    expect(result.order).toEqual([{ cliente: { razao_social: 'desc' } }]);
  });
});
