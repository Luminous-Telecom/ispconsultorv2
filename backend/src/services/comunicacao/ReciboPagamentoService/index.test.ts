jest.mock('../../../db/prisma', () => ({
  prisma: {
    financeiro_titulos: { findUnique: jest.fn() },
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));
jest.mock('../EmailService', () => ({
  EmailService: { enviarReciboPagamento: jest.fn() },
}));
jest.mock('../WhatsAppBoletoService', () => ({
  WhatsAppBoletoService: { enviarReciboPagamento: jest.fn() },
}));

import { prisma } from '../../../db/prisma';
import { EmailService } from '../EmailService';
import { WhatsAppBoletoService } from '../WhatsAppBoletoService';
import { ReciboPagamentoService } from './index';

const findUnique = prisma.financeiro_titulos.findUnique as jest.Mock;
const enviarReciboPagamentoEmail = EmailService.enviarReciboPagamento as jest.Mock;
const enviarReciboPagamentoWhatsApp = WhatsAppBoletoService.enviarReciboPagamento as jest.Mock;

function titulo(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    pago: true,
    status: 'pago',
    empresa_id: 10,
    valor: '10.00',
    clientes: { id: 3, razao_social: 'Cliente' },
    cadastros_planos: null,
    cadastros_bancos: null,
    ...overrides,
  };
}

beforeEach(() => {
  findUnique.mockReset();
  enviarReciboPagamentoEmail.mockReset();
  enviarReciboPagamentoWhatsApp.mockReset();
  enviarReciboPagamentoEmail.mockResolvedValue(true);
  enviarReciboPagamentoWhatsApp.mockResolvedValue(true);
});

it('recusa recibo de título que não está pago e não dispara envio', async () => {
  findUnique.mockResolvedValue(titulo({ pago: false, status: 'pendente' }));

  const resultado = await ReciboPagamentoService.enviarReciboManual(7, 10);

  expect(resultado).toEqual({
    sucesso: false,
    mensagem: 'Só é possível enviar recibo de título pago',
  });
  expect(enviarReciboPagamentoEmail).not.toHaveBeenCalled();
  expect(enviarReciboPagamentoWhatsApp).not.toHaveBeenCalled();
});

it('não envia recibo de título de outra empresa', async () => {
  findUnique.mockResolvedValue(titulo({ empresa_id: 10 }));

  const resultado = await ReciboPagamentoService.enviarReciboManual(7, 99);

  expect(resultado).toEqual({ sucesso: false, mensagem: 'Título não encontrado' });
  expect(enviarReciboPagamentoEmail).not.toHaveBeenCalled();
});

it('envia recibo de título pago_atraso da mesma empresa', async () => {
  findUnique.mockResolvedValue(titulo({ status: 'pago_atraso', pago: true }));

  const resultado = await ReciboPagamentoService.enviarReciboManual(7, 10);

  expect(resultado.sucesso).toBe(true);
  expect(enviarReciboPagamentoEmail).toHaveBeenCalledTimes(1);
  expect(enviarReciboPagamentoWhatsApp).toHaveBeenCalledTimes(1);
});

it('falha quando nenhum canal consegue enviar', async () => {
  findUnique.mockResolvedValue(titulo());
  enviarReciboPagamentoEmail.mockResolvedValue(false);
  enviarReciboPagamentoWhatsApp.mockResolvedValue(false);

  const resultado = await ReciboPagamentoService.enviarReciboManual(7, 10);

  expect(resultado).toEqual({ sucesso: false, mensagem: 'Não foi possível enviar o recibo' });
});
