import { buildBrPaymentSettings, normalizarLinhaDigitavelBoleto } from './brPaymentSettings';

const PIX = {
  code: '00020101021226700014br.gov.bcb.pix',
  merchantName: 'Provedor Exemplo',
  key: '39580525000189',
  keyType: 'CNPJ',
};

const LINHA_47 = '03399026944140000002628346101018898510000008848';

it('monta PIX e boleto no mesmo pagamento', () => {
  const settings = buildBrPaymentSettings({
    pix: PIX,
    linhaDigitavel: '03399.02694 41400.000026 28346.101018 8 98510000008848',
  });

  expect(settings).toEqual([
    {
      type: 'pix_dynamic_code',
      pix_dynamic_code: {
        code: PIX.code,
        merchant_name: PIX.merchantName,
        key: PIX.key,
        key_type: PIX.keyType,
      },
    },
    {
      type: 'boleto',
      boleto: { digitable_line: LINHA_47 },
    },
  ]);
});

it('envia só o boleto quando o PIX está incompleto', () => {
  const settings = buildBrPaymentSettings({
    pix: { ...PIX, key: '' },
    linhaDigitavel: LINHA_47,
  });

  expect(settings).toEqual([
    { type: 'boleto', boleto: { digitable_line: LINHA_47 } },
  ]);
});

it('envia só o PIX quando a linha digitável é inválida', () => {
  const settings = buildBrPaymentSettings({
    pix: PIX,
    linhaDigitavel: '123',
  });

  expect(settings.map((item) => item.type)).toEqual(['pix_dynamic_code']);
});

it('não monta pagamento sem PIX nem linha válida', () => {
  expect(buildBrPaymentSettings({ pix: null, linhaDigitavel: '' })).toEqual([]);
  expect(normalizarLinhaDigitavelBoleto('abc')).toBeNull();
});

it('recusa código de barras de 44 dígitos', () => {
  expect(normalizarLinhaDigitavelBoleto('03398985100000088489026941400000022834610101')).toBeNull();
});
