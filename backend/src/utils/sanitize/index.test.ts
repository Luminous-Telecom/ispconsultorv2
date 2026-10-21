import {
  isValidIPv4,
  isValidIPv6,
  sanitizeCep,
  sanitizeCnpjCpf,
  sanitizeDominio,
  sanitizeEmail,
  sanitizeInteger,
  sanitizeNumber,
  sanitizeObject,
  sanitizePhone,
  sanitizeString,
  sanitizeText,
  sanitizeUrl,
} from './index';

describe('sanitize', () => {
  it('remove HTML e caracteres de controle do texto de cadastro', () => {
    expect(sanitizeText('  Ana\u0000 ')).toBe('Ana');
    expect(sanitizeString('<script>alert(1)</script>Nome')).toBe('alert(1)Nome');
    expect(sanitizeString('<b onclick="x">Oi</b>', true)).not.toContain('onclick');
  });

  it('normaliza e-mail, documento, CEP, telefone e número', () => {
    expect(sanitizeEmail('  Ana@Empresa.COM ')).toBe('ana@empresa.com');
    expect(sanitizeEmail('sem-arroba')).toBe('');
    expect(sanitizeCnpjCpf('11.444.777/0001-61')).toBe('11444777000161');
    expect(sanitizeCnpjCpf('12.abc.345/01de-35')).toBe('12ABC34501DE35');
    expect(sanitizeCep('01310-100')).toBe('01310100');
    expect(sanitizePhone('(11) 98888-7777')).toBe('11 988887777');
    expect(sanitizeNumber('R$ 10,5')).toBe(105);
    expect(sanitizeInteger('42')).toBe(42);
    expect(sanitizeInteger(null)).toBeNull();
  });

  it('aceita domínio e URL http e recusa protocolo perigoso e IP inválido', () => {
    expect(sanitizeDominio('https://www.provedor.com/painel')).toBe('www.provedor.com/painel');
    expect(sanitizeDominio('localhost')).toBe('');
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('https://isp.test/boleto')).toBe('https://isp.test/boleto');
    expect(isValidIPv4('192.168.0.1')).toBe(true);
    expect(isValidIPv4('45.224.181.')).toBe(false);
    expect(isValidIPv6('2001:db8::1')).toBe(true);
    expect(isValidIPv6('nao-ip')).toBe(false);
  });
});

describe('sanitizeObject modelos de documento', () => {
  it('preserva HTML de recibo e carta', () => {
    const result = sanitizeObject({
      conteudo_recibo: '<p>Recibo <strong>ok</strong></p>',
      conteudo_carta: '<p>Carta</p>',
    });

    expect(result.conteudo_recibo).toBe('<p>Recibo <strong>ok</strong></p>');
    expect(result.conteudo_carta).toBe('<p>Carta</p>');
  });

  it('escapa HTML fora dos campos de documento', () => {
    const result = sanitizeObject({ observacao: '<script>alert(1)</script>' });
    expect(String(result.observacao)).not.toContain('<script>');
  });
});