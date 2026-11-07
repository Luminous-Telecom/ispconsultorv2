jest.mock('../../../db/prisma', () => ({
  prisma: {
    blockdomi_versoes: { findMany: jest.fn(), findFirst: jest.fn() },
    blockdomi_dominios: { findMany: jest.fn(), count: jest.fn() },
    blockdomi_ipv4: { findMany: jest.fn(), count: jest.fn() },
    blockdomi_ipv6: { findMany: jest.fn(), count: jest.fn() },
  },
}));

import { prisma } from '../../../db/prisma';
import { formatDateISOLocal } from '../../../utils/timezoneUtils';
import { BlockdomiPublicoService } from './index';

const versoes = prisma.blockdomi_versoes;
const dominios = prisma.blockdomi_dominios;
const ipv4 = prisma.blockdomi_ipv4;
const ipv6 = prisma.blockdomi_ipv6;

function linha(extra: Record<string, unknown>) {
  return {
    nome_oficio: 'Ofício nº 10',
    data_inicio_bloqueio: new Date(2026, 0, 2),
    data_fim_bloqueio: new Date(2026, 5, 1),
    versao_id: 1,
    created_at: new Date('2026-01-02T12:00:00.000Z'),
    blockdomi_versoes: { numero: '2026010201' },
    blockdomi_numeros_sei_anatel: { numero: '12345' },
    ...extra,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (versoes.findMany as jest.Mock).mockResolvedValue([{ id: 1, numero: '2026010201' }]);
  (versoes.findFirst as jest.Mock).mockResolvedValue({ numero: '2026010201' });
  (dominios.count as jest.Mock).mockImplementation(async ({ where }: { where: { dominio?: { contains?: string; not?: unknown } } }) => {
    if (where.dominio && 'contains' in where.dominio) return 1;
    return 1;
  });
  (ipv4.count as jest.Mock).mockResolvedValue(2);
  (ipv6.count as jest.Mock).mockResolvedValue(1);
});

describe('BlockdomiPublicoService.listarDadosPublicos', () => {
  it('agrupa domínio, URL, IPv4 e IPv6 no mesmo ofício e devolve a contagem de cada lista', async () => {
    (dominios.findMany as jest.Mock).mockResolvedValue([
      linha({ dominio: 'exemplo.com' }),
      linha({ dominio: 'https://exemplo.com/caminho' }),
    ]);
    (ipv4.findMany as jest.Mock).mockResolvedValue([
      linha({ ip: '203.0.113.10' }),
      linha({ ip: '198.51.100.2' }),
    ]);
    (ipv6.findMany as jest.Mock).mockResolvedValue([
      linha({ ip: '2001:db8::1' }),
    ]);

    const data = await BlockdomiPublicoService.listarDadosPublicos();

    expect(data.oficios).toHaveLength(1);
    expect(data.oficios[0].nome_oficio).toBe('Ofício nº 10');
    expect(data.oficios[0].numero_sei_anatel).toBe('12345');
    expect(data.oficios[0].versao).toBe('2026010201');
    expect(data.oficios[0].created_at).toBe(formatDateISOLocal(new Date('2026-01-02T12:00:00.000Z')));
    expect(data.oficios[0].created_at?.endsWith('Z')).toBe(false);
    expect(data.oficios[0].detalhes).toEqual({
      qtd_dominios: 1,
      qtd_urls: 1,
      qtd_ipv4: 2,
      qtd_ipv6: 1,
      dominios: ['exemplo.com'],
      urls: ['https://exemplo.com/caminho'],
      ipv4: ['198.51.100.2', '203.0.113.10'],
      ipv6: ['2001:db8::1'],
    });
    expect(data.stats).toEqual({
      total_dominios: 1,
      total_ipv4: 2,
      total_ipv6: 1,
      total_urls: 1,
    });
    expect(dominios.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ativo: true } }));
  });

  it('separa ofícios de versão diferente e deixa listas vazias quando não há itens', async () => {
    (dominios.findMany as jest.Mock).mockResolvedValue([
      linha({ dominio: 'a.com' }),
      linha({
        dominio: 'b.com',
        versao_id: 2,
        blockdomi_versoes: { numero: '2026010301' },
        nome_oficio: 'Ofício nº 11',
      }),
    ]);
    (ipv4.findMany as jest.Mock).mockResolvedValue([]);
    (ipv6.findMany as jest.Mock).mockResolvedValue([]);
    (dominios.count as jest.Mock).mockResolvedValue(0);
    (ipv4.count as jest.Mock).mockResolvedValue(0);
    (ipv6.count as jest.Mock).mockResolvedValue(0);

    const data = await BlockdomiPublicoService.listarDadosPublicos();

    expect(data.oficios.map((o) => o.nome_oficio).sort()).toEqual(['Ofício nº 10', 'Ofício nº 11']);
    const oficio11 = data.oficios.find((o) => o.nome_oficio === 'Ofício nº 11');
    expect(oficio11?.detalhes?.dominios).toEqual(['b.com']);
    expect(oficio11?.detalhes?.qtd_ipv4).toBe(0);
    expect(oficio11?.detalhes?.ipv4).toEqual([]);
    expect(oficio11?.detalhes?.urls).toEqual([]);
  });

  it('mantém o dia do bloqueio gravado e a hora de criação no relógio do servidor', async () => {
    const criado = new Date('2026-10-14T15:30:00.000Z');
    (dominios.findMany as jest.Mock).mockResolvedValue([
      linha({
        dominio: 'calendario.com',
        data_inicio_bloqueio: new Date('2026-10-14T00:00:00.000Z'),
        data_fim_bloqueio: new Date('2026-12-01T00:00:00.000Z'),
        created_at: criado,
      }),
    ]);
    (ipv4.findMany as jest.Mock).mockResolvedValue([]);
    (ipv6.findMany as jest.Mock).mockResolvedValue([]);

    const data = await BlockdomiPublicoService.listarDadosPublicos();

    expect(data.oficios[0].data_inicio_bloqueio).toBe('2026-10-14');
    expect(data.oficios[0].data_fim_bloqueio).toBe('2026-12-01');
    const hora = String(criado.getHours()).padStart(2, '0');
    const minuto = String(criado.getMinutes()).padStart(2, '0');
    expect(data.oficios[0].created_at).toContain(`T${hora}:${minuto}:`);
    expect(data.oficios[0].created_at).not.toBe(criado.toISOString());
  });
});
