jest.mock('../../db/prisma', () => ({
  prisma: {
    sistema_logs_operacionais: { create: jest.fn().mockResolvedValue({ id: 1n }) },
  },
}));

import { prisma } from '../../db/prisma';
import { formatCreatedAt } from '../../utils/dateUtils';
import { formatDateISOLocal } from '../../utils/timezoneUtils';
import { plainBlockdomi, registrarOperacaoDelete } from './blockdomiPrisma';

describe('plainBlockdomi', () => {
  it('expõe versão e número SEI para a listagem', () => {
    const plain = plainBlockdomi({
      id: 137954,
      data_inicio_bloqueio: new Date('2026-10-14T00:00:00.000Z'),
      data_fim_bloqueio: null,
      blockdomi_versoes: { numero: '2026101412' },
      blockdomi_numeros_sei_anatel: { numero: '16430998' },
    }, true);

    expect(plain.versao).toBe('2026101412');
    expect(plain.numero_sei_anatel).toBe('16430998');
    expect(plain.data_inicio_bloqueio).toBe('2026-10-14');
  });

  it('grava created_at no relógio do servidor', () => {
    const criado = new Date('2026-11-06T21:47:00.000Z');
    const plain = plainBlockdomi({
      id: 1,
      data_inicio_bloqueio: null,
      data_fim_bloqueio: null,
      created_at: criado,
      blockdomi_versoes: null,
      blockdomi_numeros_sei_anatel: null,
    }, false);

    expect(plain.created_at).toBe(formatDateISOLocal(criado));
    expect(plain.created_at_formatada).toBe(formatCreatedAt(criado));
    expect(String(plain.created_at).endsWith('Z')).toBe(false);
  });

  it('deixa versão e SEI vazios quando o domínio não tem vínculo', () => {
    const plain = plainBlockdomi({
      id: 1,
      data_inicio_bloqueio: null,
      data_fim_bloqueio: null,
      blockdomi_versoes: null,
      blockdomi_numeros_sei_anatel: null,
    }, true);

    expect(plain.versao).toBeNull();
    expect(plain.numero_sei_anatel).toBeNull();
  });
});

describe('registrarOperacaoDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('grava a exclusão no log unificado da empresa', async () => {
    await registrarOperacaoDelete('dominio_delete', 4, 2, [8, 9], 10);
    const data = (prisma.sistema_logs_operacionais.create as jest.Mock).mock.calls[0][0].data;
    expect(data.canal).toBe('sistema');
    expect(data.tipo).toBe('dominio_delete');
    expect(data.empresa_id).toBe(10);
    expect(data.recurso).toBe('blockdomi_operacao');
    const payload = JSON.parse(data.payload);
    expect(payload.log_contexto).toBe('blockdomi_operacao');
    expect(payload.ids_deletados).toEqual([8, 9]);
  });
});
