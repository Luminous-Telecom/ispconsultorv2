import { Titulo } from 'types';
import { TituloService } from 'services/tituloService';
import { createTituloEnviarAction } from './contratoTituloBulkActionHelpers';

jest.mock('services/tituloService', () => ({
  TituloService: {
    enviarWhatsApp: jest.fn(),
    enviarEmail: jest.fn(),
    enviarRecibo: jest.fn(),
  },
}));

const enviarRecibo = TituloService.enviarRecibo as jest.Mock;

function criarAcao() {
  const success = jest.fn();
  const showApiError = jest.fn();
  const t = (key: string, params?: Record<string, string | number>) =>
    params?.count != null ? `${key}:${params.count}` : key;

  const action = createTituloEnviarAction({
    t: t as never,
    success,
    showApiError,
    bulkBtn: { enviar: { label: 'Enviar', variant: 'primary' } } as never,
  });

  const recibo = action.dropdown?.find((item) => item.label === 'other.receipt');
  return { action, recibo, success, showApiError };
}

function titulo(status: Titulo['status']): Titulo {
  return { id: status === 'pago' ? 1 : 2, status } as Titulo;
}

it('deixa Recibo desabilitado quando nenhum título selecionado está pago', () => {
  const { recibo } = criarAcao();
  const disabled = recibo?.disabled;

  expect(typeof disabled).toBe('function');
  if (typeof disabled !== 'function') return;

  expect(disabled([])).toBe(true);
  expect(disabled([titulo('pendente')])).toBe(true);
  expect(disabled([titulo('pago'), titulo('pendente')])).toBe(false);
});

it('envia recibo só dos títulos pagos', async () => {
  enviarRecibo.mockResolvedValue({ success: true, message: 'ok' });
  const { recibo, success } = criarAcao();

  await recibo?.action([titulo('pendente'), titulo('pago')]);

  expect(enviarRecibo).toHaveBeenCalledTimes(1);
  expect(enviarRecibo).toHaveBeenCalledWith(1);
  expect(success).toHaveBeenCalledWith('messages.successSendReceipt');
});
