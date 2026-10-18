import { Titulo } from 'types';
import { TituloService } from 'services/tituloService';
import {
  createTituloConsultarPagamentoAction,
  createTituloEnviarAction,
} from './contratoTituloBulkActionHelpers';

jest.mock('services/tituloService', () => ({
  TituloService: {
    enviarWhatsApp: jest.fn(),
    enviarEmail: jest.fn(),
    enviarRecibo: jest.fn(),
    consultarRecebimento: jest.fn(),
  },
}));

const enviarRecibo = TituloService.enviarRecibo as jest.Mock;
const consultarRecebimento = TituloService.consultarRecebimento as jest.Mock;

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

it('consulta pagamento só de títulos com charge_id e não cancelados', async () => {
  consultarRecebimento.mockResolvedValue({
    success: true,
    message: 'Título consultado - sem alterações (ainda não foi pago)',
  });
  const success = jest.fn();
  const showApiError = jest.fn();
  const onDone = jest.fn().mockResolvedValue(undefined);
  const t = (key: string, params?: Record<string, string | number>) =>
    params?.count != null ? `${key}:${params.count}` : key;

  const action = createTituloConsultarPagamentoAction(
    {
      t: t as never,
      success,
      showApiError,
      bulkBtn: { consultarPagamento: { label: 'Consultar pagamento', variant: 'primary' } } as never,
    },
    onDone
  );

  expect(action.disabled?.([])).toBe(true);
  expect(
    action.disabled?.([{ id: 1, status: 'pendente' } as Titulo])
  ).toBe(true);
  expect(
    action.disabled?.([{ id: 2, status: 'pendente', charge_id: '123' } as Titulo])
  ).toBe(false);

  await action.action([
    { id: 1, status: 'pendente' } as Titulo,
    { id: 2, status: 'pendente', charge_id: '123' } as Titulo,
    { id: 3, status: 'cancelado', charge_id: '456' } as Titulo,
  ]);

  expect(consultarRecebimento).toHaveBeenCalledTimes(1);
  expect(consultarRecebimento).toHaveBeenCalledWith(2);
  expect(onDone).toHaveBeenCalled();
  expect(success).toHaveBeenCalledWith('Título consultado - sem alterações (ainda não foi pago)');
});
