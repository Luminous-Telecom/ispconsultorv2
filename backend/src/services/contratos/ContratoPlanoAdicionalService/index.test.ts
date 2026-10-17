jest.mock('../../../db/prisma', () => ({
  prisma: {
    contratos_planos_adicionais: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../../../db/prisma';
import { ContratoPlanoAdicionalService } from './index';

const planos = prisma.contratos_planos_adicionais;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ContratoPlanoAdicionalService', () => {
  it('devolve nulo quando o plano adicional não existe', async () => {
    (planos.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(ContratoPlanoAdicionalService.getById(99, false)).resolves.toBeNull();
  });

  it('grava contrato, plano e valor recebidos', async () => {
    (planos.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 2, ...data }));
    await ContratoPlanoAdicionalService.create({
      contrato_id: 4,
      plano_id: 7,
      empresa_id: 10,
      valor_final: 19.9,
    });
    expect(planos.create).toHaveBeenCalledWith({
      data: { contrato_id: 4, plano_id: 7, empresa_id: 10, valor_final: 19.9 },
    });
  });

  it('altera só o valor enviado', async () => {
    (planos.findUnique as jest.Mock).mockResolvedValue({ id: 2, contrato_id: 4 });
    (planos.update as jest.Mock).mockResolvedValue({
      id: 2,
      valor: 30,
      cadastros_planos: null,
    });
    await ContratoPlanoAdicionalService.update(2, { valor_final: 30 });
    expect(planos.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 2 },
      data: { valor_final: 30 },
    }));
  });

  it('não grava quando o id não existe', async () => {
    (planos.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(ContratoPlanoAdicionalService.update(99, { valor_final: 1 })).rejects.toThrow('não encontrado');
    expect(planos.update).not.toHaveBeenCalled();
  });
});
