jest.mock('../../../db/prisma', () => ({
  prisma: {
    cadastros_dias_vencimento: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

import { prisma } from '../../../db/prisma';
import { DiasVencimentoService } from './index';

const dias = prisma.cadastros_dias_vencimento;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DiasVencimentoService', () => {
  it('lista só a empresa e aceita resultado vazio', async () => {
    (dias.findMany as jest.Mock).mockResolvedValue([]);
    await expect(DiasVencimentoService.list(null, 10)).resolves.toEqual([]);
    expect(dias.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { empresa_id: 10 },
    }));
  });

  it('cria o dia informado na empresa', async () => {
    (dias.findMany as jest.Mock).mockResolvedValue([]);
    (dias.findFirst as jest.Mock).mockResolvedValue(null);
    (dias.create as jest.Mock).mockResolvedValue({ id: 1 });
    await DiasVencimentoService.upsertDias([10], 10);
    expect(dias.create).toHaveBeenCalledWith({
      data: { empresa_id: 10, dia: 10, dia_padrao: 10, ativo: true },
    });
  });

  it('não cria dia fora de 1 a 30', async () => {
    (dias.findMany as jest.Mock).mockResolvedValue([]);
    await DiasVencimentoService.upsertDias([0, 40], 10);
    expect(dias.create).not.toHaveBeenCalled();
  });
});
