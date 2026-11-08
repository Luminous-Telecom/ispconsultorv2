jest.mock('../../../db/prisma', () => ({
  prisma: {
    financeiro_titulos: { findMany: jest.fn(), aggregate: jest.fn() },
    contratos: { findMany: jest.fn() },
    sistema_scheduled_routines: { findFirst: jest.fn() },
    comunicacao_mensagens_email: { findMany: jest.fn() },
    comunicacao_mensagens_whatsapp: { findMany: jest.fn() },
  },
}));

import { prisma } from '../../../db/prisma';
import { CobrancaPainelService } from './index';

const titulos = prisma.financeiro_titulos.findMany as jest.Mock;
const aggregate = prisma.financeiro_titulos.aggregate as jest.Mock;
const contratos = prisma.contratos.findMany as jest.Mock;
const rotinas = prisma.sistema_scheduled_routines.findFirst as jest.Mock;
const emails = prisma.comunicacao_mensagens_email.findMany as jest.Mock;
const whatsapps = prisma.comunicacao_mensagens_whatsapp.findMany as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  titulos.mockResolvedValue([]);
  aggregate.mockResolvedValue({ _sum: { valor: 0 } });
  contratos.mockResolvedValue([]);
  rotinas.mockResolvedValue(null);
  emails.mockResolvedValue([]);
  whatsapps.mockResolvedValue([]);
});

describe('CobrancaPainelService', () => {
  it('filtra indicadores pela empresa do token', async () => {
    await CobrancaPainelService.indicadores(9, '2026-11');
    expect(titulos).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ empresa_id: 9, status: { not: 'cancelado' } }),
    }));
    expect(contratos).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ empresa_id: 9, status: 'ativo' }),
    }));
  });

  it('não consulta título de outra empresa na agenda', async () => {
    emails.mockResolvedValue([{ tipo: '10_dias_antes_vencimento' }]);
    const agenda = await CobrancaPainelService.agenda(4, { page: 1, limit: 15 });
    expect(emails).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ empresa_id: 4, ativo: true }),
    }));
    expect(titulos).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ empresa_id: 4, pago: false }),
    }));
    expect(agenda.sem_passos).toBe(false);
  });

  it('não lista aviso quando a mensagem está desativada', async () => {
    emails.mockResolvedValue([]);
    const agenda = await CobrancaPainelService.agenda(4, { page: 1, limit: 15 });
    expect(agenda.sem_passos).toBe(true);
    expect(titulos).not.toHaveBeenCalled();
  });
});
