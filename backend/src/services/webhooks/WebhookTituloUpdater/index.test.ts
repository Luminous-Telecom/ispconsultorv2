import { updateTituloWebhook } from './index';
import { TituloService } from '../../financeiro/TituloService';

jest.mock('../../financeiro/TituloService', () => ({
  TituloService: {
    update: jest.fn(),
    getById: jest.fn(),
  },
}));

jest.mock('../../comunicacao/ReciboPagamentoService', () => ({
  ReciboPagamentoService: { enviarRecibo: jest.fn() },
}));

jest.mock('../../sistema/AuditoriaRegistroService', () => ({
  registrarAtualizacao: jest.fn(),
}));

const tituloServiceUpdate = TituloService.update as jest.Mock;

describe('updateTituloWebhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('usa titulo.update quando existir (shape Prisma)', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const resolved = {
      titulo: { id: 1, update },
      banco: null,
    } as never;

    await updateTituloWebhook(resolved, { status: 'pago', pago: true });

    expect(update).toHaveBeenCalledWith({ status: 'pago', pago: true });
    expect(tituloServiceUpdate).not.toHaveBeenCalled();
  });

  it('não chama update com payload vazio', async () => {
    const update = jest.fn();
    const resolved = {
      titulo: { id: 1, update },
      banco: null,
    } as never;

    await updateTituloWebhook(resolved, {});

    expect(update).not.toHaveBeenCalled();
  });
});
