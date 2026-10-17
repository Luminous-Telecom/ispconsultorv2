jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../../db/prisma', () => ({
  prisma: {
    sistema_logs_operacionais: { create: jest.fn() },
  },
}));

import { prisma } from '../../../db/prisma';
import { recordSshDeviceBackupEvent } from './index';

const logs = prisma.sistema_logs_operacionais.create as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  logs.mockResolvedValue({ id: 1n });
});

describe('recordSshDeviceBackupEvent', () => {
  it('grava o evento no log unificado com a empresa do equipamento', async () => {
    await recordSshDeviceBackupEvent({
      sshDeviceId: 12,
      empresaId: 10,
      status: 'sucesso',
      detail: 'enviado',
    });
    const data = logs.mock.calls[0][0].data;
    expect(data.canal).toBe('ssh');
    expect(data.tipo).toBe('sucesso');
    expect(data.empresa_id).toBe(10);
    expect(data.recurso_id).toBe('12');
    expect(JSON.parse(data.payload).log_contexto).toBe('ssh_backup');
  });

  it('não grava equipamento inválido', async () => {
    await recordSshDeviceBackupEvent({ sshDeviceId: 0, empresaId: 10, status: 'falha' });
    expect(logs).not.toHaveBeenCalled();
  });
});
