import { buildLocalWireguardSteps, parseWgDump, isWireguardHandshakeFresh } from '../wireguardLocal';
import type { LocalWireguardSpec } from '../wireguardLocal';

const spec: LocalWireguardSpec = {
  iface: 'ispwg7',
  privateKey: 'cHJpdmF0ZQ==',
  peerPublicKey: 'cHVibGlj',
  endpointHost: '203.0.113.10',
  endpointPort: 13231,
  ourAddress: '10.200.0.2',
  prefix: 30,
  peerAddress: '10.200.0.1',
  lanCidrs: ['192.168.88.0/24'],
  tableId: 10007,
  rulePriority: 1007,
};

describe('buildLocalWireguardSteps', () => {
  it('sobe a interface, o peer e a rota da LAN numa tabela própria', () => {
    const steps = buildLocalWireguardSteps(spec, '/tmp/key');
    const wg = steps.find((step) => step.cmd === 'wg');
    expect(wg?.args).toEqual(expect.arrayContaining([
      'ispwg7',
      'peer',
      'cHVibGlj',
      'endpoint',
      '203.0.113.10:13231',
      'allowed-ips',
      '10.200.0.1/32,192.168.88.0/24',
    ]));
    expect(steps.some((step) => step.args.includes('10007') && step.args.includes('192.168.88.0/24'))).toBe(true);
    expect(steps.some((step) => step.args[0] === 'rule' && step.args.includes('10.200.0.2/32'))).toBe(true);
  });
});

describe('parseWgDump', () => {
  it('lê o handshake do peer e ignora a linha da interface', () => {
    const dump = [
      'ispwg7\tpriv\tpub\t0\toff',
      'ispwg7\tpeer\tnone\t203.0.113.10:13231\t10.200.0.1/32\t1700000000\t1\t2\t25',
    ].join('\n');
    expect(parseWgDump(dump).get('ispwg7')).toBe(1700000000);
    expect(isWireguardHandshakeFresh(1700000000, 1700000010)).toBe(true);
    expect(isWireguardHandshakeFresh(1700000000, 1700000300)).toBe(false);
    expect(isWireguardHandshakeFresh(0)).toBe(false);
  });
});
