jest.mock('../../db/prisma', () => ({
  prisma: {
    sistema_logs_operacionais: { create: jest.fn().mockResolvedValue({ id: 1n }) },
  },
}));

import { prisma } from '../../db/prisma';
import { registrarOperacaoDelete } from './blockdomiPrisma';

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
