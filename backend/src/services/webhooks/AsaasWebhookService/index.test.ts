jest.mock('../../../models/cadastros/Banco', () => ({
  Banco: { findOne: jest.fn(), findAll: jest.fn() },
}));

jest.mock('../../../models/financeiro/Titulo', () => ({
  Titulo: { findOne: jest.fn() },
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../bancos/BarcodeService', () => ({
  BarcodeService: {},
}));

jest.mock('../WebhookTituloUpdater', () => ({
  applyPagoWebhook: jest.fn(),
  enviarReciboSeAdmin: jest.fn(),
  registrarAuditoriaWebhook: jest.fn(),
  refetchResolvedTitulo: jest.fn(),
  updateTituloWebhook: jest.fn(),
}));

jest.mock('../../sistema/AuditoriaRegistroService', () => ({
  registrarAtualizacao: jest.fn(),
}));

import { Banco } from '../../../models/cadastros/Banco';
import { Titulo } from '../../../models/financeiro/Titulo';
import { AsaasWebhookService } from './index';

const bancoFindOne = Banco.findOne as jest.Mock;
const bancoFindAll = Banco.findAll as jest.Mock;
const tituloFindOne = Titulo.findOne as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AsaasWebhookService.resolveEmpresaIdentifier', () => {
  it('mantém o id que já veio na URL', async () => {
    const id = await AsaasWebhookService.resolveEmpresaIdentifier({
      urlIdentifier: '12',
      paymentId: 'pay_abc',
    });

    expect(id).toBe('12');
    expect(tituloFindOne).not.toHaveBeenCalled();
  });

  it('acha o banco pelo charge_id quando a URL é /webhook/asaas', async () => {
    tituloFindOne.mockResolvedValueOnce({ id: 63, banco_id: 4, charge_id: 'pay_r9opvbsrae7l19yf' });
    bancoFindOne.mockResolvedValueOnce({ id: 4, tipo_banco: 'asaas', ativo: true });

    const id = await AsaasWebhookService.resolveEmpresaIdentifier({
      paymentId: 'pay_r9opvbsrae7l19yf',
      externalReference: 'titulo_63',
    });

    expect(id).toBe('4');
    expect(tituloFindOne).toHaveBeenCalledWith({ where: { charge_id: 'pay_r9opvbsrae7l19yf' } });
    expect(bancoFindOne).toHaveBeenCalledWith({
      where: { id: 4, tipo_banco: 'asaas', ativo: true },
    });
  });

  it('usa externalReference titulo_N quando o charge_id não existe', async () => {
    tituloFindOne.mockResolvedValueOnce(null);
    tituloFindOne.mockResolvedValueOnce({ id: 63, banco_id: 4 });
    bancoFindOne.mockResolvedValueOnce({ id: 4, tipo_banco: 'asaas', ativo: true });

    const id = await AsaasWebhookService.resolveEmpresaIdentifier({
      paymentId: 'pay_inexistente',
      externalReference: 'titulo_63',
    });

    expect(id).toBe('4');
    expect(tituloFindOne).toHaveBeenLastCalledWith({ where: { id: 63 } });
  });

  it('recusa externalReference que não é titulo_N', async () => {
    tituloFindOne.mockResolvedValue(null);
    bancoFindAll.mockResolvedValue([]);

    const id = await AsaasWebhookService.resolveEmpresaIdentifier({
      externalReference: 'cliente_10',
    });

    expect(id).toBeUndefined();
    expect(tituloFindOne).not.toHaveBeenCalled();
  });

  it('cai no único banco Asaas ativo quando a cobrança ainda não está no ERP', async () => {
    tituloFindOne.mockResolvedValue(null);
    bancoFindAll.mockResolvedValue([{ id: 7, tipo_banco: 'asaas', ativo: true, webhook_secret: 'tok' }]);

    const id = await AsaasWebhookService.resolveEmpresaIdentifier({
      paymentId: 'pay_novo',
      externalReference: 'titulo_99',
    });

    expect(id).toBe('7');
  });

  it('com vários bancos Asaas, usa o token que bate com um só', async () => {
    tituloFindOne.mockResolvedValue(null);
    bancoFindAll.mockResolvedValue([
      { id: 1, webhook_secret: 'aaa' },
      { id: 2, webhook_secret: 'bbb' },
    ]);

    const id = await AsaasWebhookService.resolveEmpresaIdentifier({
      paymentId: 'pay_novo',
      receivedSecret: 'bbb',
    });

    expect(id).toBe('2');
  });

  it('com vários bancos e token ambíguo, não escolhe banco', async () => {
    tituloFindOne.mockResolvedValue(null);
    bancoFindAll.mockResolvedValue([
      { id: 1, webhook_secret: 'mesmo' },
      { id: 2, webhook_secret: 'mesmo' },
    ]);

    const id = await AsaasWebhookService.resolveEmpresaIdentifier({
      receivedSecret: 'mesmo',
    });

    expect(id).toBeUndefined();
  });
});
