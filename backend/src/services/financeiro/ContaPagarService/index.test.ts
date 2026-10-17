jest.mock('../../../db/prisma', () => ({
  prisma: {
    financeiro_contas_pagar: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    financeiro_conta_pagar_pagamentos: { create: jest.fn() },
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import { prisma } from '../../../db/prisma';
import { ContaPagarService } from './index';

const contas = prisma.financeiro_contas_pagar;

const row = {
  id: 6,
  empresa_id: 10,
  fornecedor_id: 5,
  valor: '50.00',
  valor_pago: '0.00',
  status: 'A_PAGAR',
  financeiro_fornecedores: null,
  financeiro_conta_pagar_pagamentos: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ContaPagarService', () => {
  it('lista só a empresa e aceita lista vazia', async () => {
    (contas.count as jest.Mock).mockResolvedValue(0);
    (contas.findMany as jest.Mock).mockResolvedValue([]);

    const resultado = await ContaPagarService.list({ empresa_id: 10 });

    expect(resultado.data).toEqual([]);
    expect(contas.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: [{ empresa_id: 10 }] },
    }));
  });

  it('visualização inexistente devolve nulo', async () => {
    (contas.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(ContaPagarService.getById(99)).resolves.toBeNull();
  });

  it('cadastro persiste empresa e fornecedor e preenche a data de cadastro', async () => {
    (contas.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 6, ...data }));

    await ContaPagarService.create({
      fornecedor_id: 5,
      empresa_id: 10,
      valor: 50,
      status: 'A_PAGAR',
      data_vencimento: new Date('2026-10-20'),
    });

    const data = (contas.create as jest.Mock).mock.calls[0][0].data;
    expect(data.empresa_id).toBe(10);
    expect(data.fornecedor_id).toBe(5);
    expect(data.data_cadastro).toBeInstanceOf(Date);
  });

  it('edição altera só o status', async () => {
    (contas.findUnique as jest.Mock).mockResolvedValue(row);
    (contas.update as jest.Mock).mockResolvedValue(row);

    await ContaPagarService.update(6, { status: 'PAGO' });

    expect(contas.update).toHaveBeenCalledWith({
      where: { id: 6 },
      data: { status: 'PAGO' },
    });
  });

  it('não grava conta inexistente', async () => {
    (contas.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(ContaPagarService.update(99, { status: 'PAGO' })).rejects.toThrow('Conta a pagar não encontrada');
    expect(contas.update).not.toHaveBeenCalled();
  });
});
