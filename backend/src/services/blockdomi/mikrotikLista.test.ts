import {
  ADLIST_IP_PADRAO,
  formatarAdlist,
  formatarMikrotikV6,
  ipv4AdlistValido,
  MIKROTIK_V6_ADDRESS,
} from './mikrotikLista';

describe('lista MikroTik', () => {
  const dominios = ['Exemplo.com', 'exemplo.com', ' outro.net ', 'ruim com espaço', 'aspas".com'];

  it('aceita IPv4 de adlist e recusa o resto', () => {
    expect(ipv4AdlistValido('0.0.0.0')).toBe(true);
    expect(ipv4AdlistValido('10.255.128.2')).toBe(true);
    expect(ipv4AdlistValido('10.255.128.2/32')).toBe(false);
    expect(ipv4AdlistValido('exemplo.com')).toBe(false);
  });

  it('monta a adlist do RouterOS v7 com 0.0.0.0', () => {
    expect(formatarAdlist(dominios, ADLIST_IP_PADRAO)).toBe(
      '0.0.0.0 Exemplo.com\n0.0.0.0 outro.net\n'
    );
  });

  it('monta a adlist com o IP informado no final da URL', () => {
    expect(formatarAdlist(['exemplo.com', 'exemplo.net'], '10.255.128.2')).toBe(
      '10.255.128.2 exemplo.com\n10.255.128.2 exemplo.net\n'
    );
  });

  it('monta o script de DNS Static do RouterOS v6', () => {
    expect(formatarMikrotikV6(['assistirseriesmp4.com'])).toBe(
      `/ip dns static add name="assistirseriesmp4.com" address=${MIKROTIK_V6_ADDRESS} comment="Blocked by Blockdomi"\n`
    );
  });

  it('devolve arquivo vazio quando não há domínio utilizável', () => {
    expect(formatarAdlist(['ruim com espaço'], ADLIST_IP_PADRAO)).toBe('');
    expect(formatarMikrotikV6([])).toBe('');
  });
});
