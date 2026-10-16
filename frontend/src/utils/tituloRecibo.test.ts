import { isTituloPagoParaRecibo } from './tituloRecibo';

it('aceita título pago e pago com atraso', () => {
  expect(isTituloPagoParaRecibo('pago')).toBe(true);
  expect(isTituloPagoParaRecibo('pago_atraso')).toBe(true);
});

it('recusa título pendente, parcial ou cancelado', () => {
  expect(isTituloPagoParaRecibo('pendente')).toBe(false);
  expect(isTituloPagoParaRecibo('parcial')).toBe(false);
  expect(isTituloPagoParaRecibo('cancelado')).toBe(false);
  expect(isTituloPagoParaRecibo(null)).toBe(false);
});
