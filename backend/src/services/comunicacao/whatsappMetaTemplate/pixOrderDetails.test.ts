import { detectPixKeyType, parsePixOrderDetailsIdentity } from './pixOrderDetails';

function tlv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

it('lê o nome do recebedor e a chave CNPJ embutida no PIX', () => {
  const merchantAccount = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', '45872335000138');
  const emv = tlv('00', '01') + tlv('01', '12') + tlv('26', merchantAccount) + tlv('59', 'EFISA');

  expect(parsePixOrderDetailsIdentity(emv)).toEqual({
    merchantName: 'EFISA',
    key: '45872335000138',
    keyType: 'CNPJ',
    locationUrl: undefined,
  });
});

it('guarda a URL do PIX dinâmico quando a chave não vem no código', () => {
  const merchantAccount = tlv('00', 'br.gov.bcb.pix') + tlv('25', 'qrcodespix.exemplo.com.br/v2/cobv/abc');
  const emv = tlv('00', '01') + tlv('26', merchantAccount) + tlv('59', 'EFISA');
  const parsed = parsePixOrderDetailsIdentity(emv);

  expect(parsed?.merchantName).toBe('EFISA');
  expect(parsed?.key).toBeUndefined();
  expect(parsed?.locationUrl).toBe('https://qrcodespix.exemplo.com.br/v2/cobv/abc');
});

it('recusa código que não é PIX', () => {
  expect(parsePixOrderDetailsIdentity('linha digitavel')).toBeNull();
});

it('classifica chave aleatória, CPF e e-mail', () => {
  expect(detectPixKeyType('123e4567-e89b-12d3-a456-426614174000')).toBe('EVP');
  expect(detectPixKeyType('71189951428')).toBe('CPF');
  expect(detectPixKeyType('financeiro@exemplo.com')).toBe('EMAIL');
  expect(detectPixKeyType('')).toBeNull();
});
