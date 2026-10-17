jest.mock('../../../utils/cache', () => ({
  cache: { get: jest.fn(() => undefined), set: jest.fn(), delete: jest.fn() },
}));

jest.mock('../../../db/prisma', () => ({
  prisma: {
    sistema_parametros: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}));

import { prisma } from '../../../db/prisma';
import { ParametrosService } from './index';

const parametros = prisma.sistema_parametros;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ParametrosService', () => {
  it('lê os parâmetros da empresa', async () => {
    (parametros.findFirst as jest.Mock).mockResolvedValue({ id: 1, empresa_id: 10, validar_cpf_cnpj: true });
    const row = await ParametrosService.get(10);
    expect(row.empresa_id).toBe(10);
    expect(parametros.findFirst).toHaveBeenCalledWith({ where: { empresa_id: 10 } });
  });

  it('cria o padrão da empresa quando ainda não existe', async () => {
    (parametros.findFirst as jest.Mock).mockResolvedValue(null);
    (parametros.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 2, ...data }));
    await ParametrosService.get(10);
    expect((parametros.create as jest.Mock).mock.calls[0][0].data.empresa_id).toBe(10);
  });

  it('altera só o campo enviado e mantém a empresa', async () => {
    (parametros.findFirst as jest.Mock).mockResolvedValue({ id: 2, empresa_id: 10 });
    (parametros.update as jest.Mock).mockResolvedValue({ id: 2, empresa_id: 10, validar_cep: true });
    await ParametrosService.update({ validar_cep: true }, 10);
    expect(parametros.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { validar_cep: true, empresa_id: 10 },
    });
    expect(parametros.create).not.toHaveBeenCalled();
  });
});
