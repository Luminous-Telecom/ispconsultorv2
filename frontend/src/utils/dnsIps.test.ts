import { isDnsIpList, isDnsIpToken } from './dnsIps';

describe('dnsIps', () => {
  it('aceita IPv4, IPv6 e CIDR', () => {
    expect(isDnsIpToken('192.168.1.1')).toBe(true);
    expect(isDnsIpToken('10.0.0.0/24')).toBe(true);
    expect(isDnsIpToken('2001:db8::1')).toBe(true);
    expect(isDnsIpList('192.168.1.1; 10.0.0.0/24\n2001:db8::1')).toBe(true);
    expect(isDnsIpList('')).toBe(true);
  });

  it('recusa hostname e faixa inválida', () => {
    expect(isDnsIpToken('dns.provedor.net')).toBe(false);
    expect(isDnsIpList('10.0.0.1; nao-e-ip')).toBe(false);
  });
});
