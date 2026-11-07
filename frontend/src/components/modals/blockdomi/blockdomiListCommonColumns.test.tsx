import { getBlockdomiCommonColumns, textoHoraBlockdomi } from './blockdomiListCommonColumns';
import type { BlockdomiTranslateFn } from './blockdomiListTypes';

const t = ((key: string) => key) as BlockdomiTranslateFn;

describe('textoHoraBlockdomi', () => {
  it('mostra a hora já formatada no servidor', () => {
    expect(textoHoraBlockdomi('06/11/2026 18:47:00', '2026-11-06T21:47:00.000Z')).toBe('06/11/2026 18:47:00');

    const atualizada = getBlockdomiCommonColumns(t).find((coluna) => coluna.key === 'updated_at');
    expect(atualizada?.render({
      id: 1,
      ativo: true,
      updated_at: '2026-11-06T21:47:00.000Z',
      updated_at_formatada: '06/11/2026 18:47:00',
    })).toBe('06/11/2026 18:47:00');
  });

  it('mostra traço quando não há hora', () => {
    expect(textoHoraBlockdomi(null, null)).toBe('-');
  });
});
