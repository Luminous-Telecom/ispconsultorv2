import { isNumericCnpj, isValidCNPJ, stripCnpj } from './validators';

describe('isValidCNPJ', () => {
  it('aceita CNPJ numérico e alfanumérico válidos', () => {
    expect(isValidCNPJ('11.444.777/0001-61')).toBe(true);
    expect(isValidCNPJ('11444777000161')).toBe(true);
    expect(isValidCNPJ('12.abc.345/01de-35')).toBe(true);
    expect(stripCnpj('12.ABC.345/01DE-35')).toBe('12ABC34501DE35');
    expect(isNumericCnpj('11.444.777/0001-61')).toBe(true);
    expect(isNumericCnpj('12.ABC.345/01DE-35')).toBe(false);
  });

  it('recusa dígito verificador errado e documento curto', () => {
    expect(isValidCNPJ('11.111.111/1111-11')).toBe(false);
    expect(isValidCNPJ('12.ABC.345/01DE-00')).toBe(false);
    expect(isValidCNPJ('123')).toBe(false);
  });
});
