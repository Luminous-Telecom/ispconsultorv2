import { entitySelectNome, formatTituloCurrency, getTituloStatusLabel } from './tituloModalUtils';

const statusLabels = {
  statusPending: 'Pendente',
  statusPaid: 'Pago',
  statusOverdue: 'Vencido',
  statusCancelled: 'Cancelada',
  statusPartial: 'Parcial',
  statusPaidLate: 'Pago em Atraso',
};

it('formata valor monetário do título', () => {
  expect(formatTituloCurrency(10)).toMatch(/10/);
});

it('retorna traço para valor inválido', () => {
  expect(formatTituloCurrency(null)).toBe('-');
});

it('traduz status do título', () => {
  expect(getTituloStatusLabel('pago', statusLabels)).toBe('Pago');
});

it('retorna traço sem status', () => {
  expect(getTituloStatusLabel(undefined, statusLabels)).toBe('-');
});

it('tira o prefixo de id do nome exibido no campo de entidade', () => {
  expect(entitySelectNome('#13 · Plano Enterprise · Ativo', 13)).toBe('Plano Enterprise · Ativo');
});

it('devolve vazio quando o rótulo é só o id ou um traço', () => {
  expect(entitySelectNome('#13', 13)).toBe('');
  expect(entitySelectNome('-', 4)).toBe('');
});
