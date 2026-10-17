import { formatCNPJ, formatCpfOrCnpj } from './formatters';

describe('formatCNPJ', () => {
  it('mascara CNPJ numérico e alfanumérico', () => {
    expect(formatCNPJ('11444777000161')).toBe('11.444.777/0001-61');
    expect(formatCNPJ('12abc34501de35')).toBe('12.ABC.345/01DE-35');
    expect(formatCpfOrCnpj('52998224725')).toBe('529.982.247-25');
    expect(formatCpfOrCnpj('12ABC34501DE35')).toBe('12.ABC.345/01DE-35');
  });

  it('não trata letra como dígito de CPF', () => {
    expect(formatCpfOrCnpj('12A')).toBe('12.A');
  });
});
