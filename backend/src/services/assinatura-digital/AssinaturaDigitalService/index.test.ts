jest.mock('../../../db/prisma', () => ({
  prisma: {
    assinatura_digital_assinaturas: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../../../db/prisma';
import { AssinaturaDigitalService } from './index';

const assinaturas = prisma.assinatura_digital_assinaturas;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AssinaturaDigitalService', () => {
  it('lista só a empresa e aceita resultado vazio', async () => {
    (assinaturas.findMany as jest.Mock).mockResolvedValue([]);
    await expect(AssinaturaDigitalService.list({ empresa_id: 10 })).resolves.toEqual([]);
    expect(assinaturas.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { empresa_id: 10 },
    }));
  });

  it('esconde assinatura de outra empresa', async () => {
    (assinaturas.findUnique as jest.Mock).mockResolvedValue({ id: 3, empresa_id: 4 });
    await expect(AssinaturaDigitalService.getById(3, 10)).resolves.toBeNull();
  });

  it('grava a assinatura na empresa informada', async () => {
    (assinaturas.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 5, ...data }));
    await AssinaturaDigitalService.create({ empresa_id: 10, cliente_id: 8, status: 'pendente' });
    expect((assinaturas.create as jest.Mock).mock.calls[0][0].data.empresa_id).toBe(10);
  });

  it('altera só o status e não grava id inexistente', async () => {
    (assinaturas.findUnique as jest.Mock).mockResolvedValueOnce({ id: 5 });
    (assinaturas.update as jest.Mock).mockResolvedValue({ id: 5, status: 'assinado' });
    await AssinaturaDigitalService.update(5, { status: 'assinado' });
    expect((assinaturas.update as jest.Mock).mock.calls[0][0].data.status).toBe('assinado');

    (assinaturas.findUnique as jest.Mock).mockResolvedValueOnce(null);
    await expect(AssinaturaDigitalService.update(99, { status: 'assinado' })).rejects.toThrow('não encontrada');
  });
});
