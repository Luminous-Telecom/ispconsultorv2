import { formatCnpj, isNumericCnpj, isValidCnpj, stripCnpj } from './index';

describe('cnpj', () => {
  it('aceita CNPJ numérico e alfanumérico com dígito verificador correto', () => {
    expect(isValidCnpj('11.444.777/0001-61')).toBe(true);
    expect(isValidCnpj('11444777000161')).toBe(true);
    expect(isValidCnpj('12.ABC.345/01DE-35')).toBe(true);
    expect(formatCnpj('12abc34501de35')).toBe('12.ABC.345/01DE-35');
    expect(stripCnpj('12.ABC.345/01DE-35')).toBe('12ABC34501DE35');
    expect(isNumericCnpj('11.444.777/0001-61')).toBe(true);
    expect(isNumericCnpj('12.ABC.345/01DE-35')).toBe(false);
  });

  it('recusa dígito verificador errado e sequência repetida', () => {
    expect(isValidCnpj('11.111.111/1111-11')).toBe(false);
    expect(isValidCnpj('12.ABC.345/01DE-00')).toBe(false);
    expect(isValidCnpj('123')).toBe(false);
  });
});
