import { Op } from 'sequelize';
import { combineFilters } from './index';

describe('combineFilters', () => {
  it('ignora filtro vazio e junta os demais com AND', () => {
    expect(combineFilters(null, undefined)).toBeNull();
    expect(combineFilters({ status: 'ativo' })).toEqual({ status: 'ativo' });
    expect(combineFilters({ status: 'ativo' }, { empresa_id: 2 })).toEqual({
      [Op.and]: [{ status: 'ativo' }, { empresa_id: 2 }],
    });
  });
});
