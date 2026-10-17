import { Op } from './types';
import { convertWhere } from './engine';

describe('convertWhere', () => {
  it('traduz LIKE com curingas para contains', () => {
    expect(convertWhere({ nome: { [Op.like]: '%ana%' } })).toEqual({
      nome: { contains: 'ana' },
    });
  });

  it('traduz IN e OR', () => {
    expect(convertWhere({
      [Op.or]: [
        { status: { [Op.in]: ['ativo', 'pendente'] } },
        { id: 3 },
      ],
    })).toEqual({
      OR: [
        { status: { in: ['ativo', 'pendente'] } },
        { id: 3 },
      ],
    });
  });

  it('devolve vazio quando o filtro não tem campos', () => {
    expect(convertWhere({})).toBeUndefined();
    expect(convertWhere(null)).toBeUndefined();
  });
});
