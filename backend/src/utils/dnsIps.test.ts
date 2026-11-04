import { isDnsIpToken, normalizeDnsIps, parseDnsIps } from './dnsIps';

describe('dnsIps', () => {
  it('aceita IPv4, IPv6 e CIDR', () => {
    expect(isDnsIpToken('192.168.1.1')).toBe(true);
    expect(isDnsIpToken('10.0.0.0/24')).toBe(true);
    expect(isDnsIpToken('2001:db8::1')).toBe(true);
    expect(isDnsIpToken('2001:db8::/32')).toBe(true);
  });

  it('recusa texto que não é IP', () => {
    expect(isDnsIpToken('dns.provedor.net')).toBe(false);
    expect(isDnsIpToken('10.0.0.0/99')).toBe(false);
    expect(isDnsIpToken('')).toBe(false);
  });

  it('normaliza separadores e descarta vazio', () => {
    expect(normalizeDnsIps(' 192.168.1.1;\n10.0.0.0/24, 2001:db8::1 ')).toBe(
      '192.168.1.1; 10.0.0.0/24; 2001:db8::1',
    );
    expect(normalizeDnsIps('  ;  ')).toBe('');
    expect(parseDnsIps('ok; 999.1.1.1').invalid).toEqual(['ok', '999.1.1.1']);
  });
});
