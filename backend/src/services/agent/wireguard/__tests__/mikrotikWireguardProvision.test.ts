import * as http from 'http';
import { AddressInfo } from 'net';
import { createMikrotikRest, RosRecord } from '../mikrotikRest';
import { provisionMikrotikWireguard } from '../mikrotikWireguardProvision';

type Store = {
  ifaces: RosRecord[];
  addresses: RosRecord[];
  peers: RosRecord[];
  filters: RosRecord[];
  puts: string[];
};

function startRouter(): Promise<{ port: number; store: Store; close: () => Promise<void> }> {
  const store: Store = {
    ifaces: [],
    addresses: [],
    peers: [],
    filters: [{ '.id': '*F1', chain: 'input', action: 'drop', comment: 'drop-all' }],
    puts: [],
  };
  let seq = 1;

  const server = http.createServer((req, res) => {
    const expected = `Basic ${Buffer.from('admin:secret', 'utf8').toString('base64')}`;
    if (req.headers.authorization !== expected) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'unauthorized' }));
      return;
    }
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) as RosRecord : {};
      const path = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
      const send = (status: number, payload: unknown) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
      };
      const routes: Array<{ base: string; rows: RosRecord[]; withKey?: boolean }> = [
        { base: '/rest/interface/wireguard/peers', rows: store.peers },
        { base: '/rest/interface/wireguard', rows: store.ifaces, withKey: true },
        { base: '/rest/ip/address', rows: store.addresses },
        { base: '/rest/ip/firewall/filter', rows: store.filters },
      ];
      const route = routes.find((item) => path === item.base || path.startsWith(`${item.base}/`));
      if (!route) {
        send(404, { message: 'not found' });
        return;
      }
      const itemId = path.startsWith(`${route.base}/`) ? path.slice(route.base.length + 1) : '';
      if (req.method === 'GET') {
        send(200, itemId ? route.rows.filter((row) => row['.id'] === itemId) : route.rows);
        return;
      }
      if (req.method === 'PUT') {
        store.puts.push(route.base);
        const created: RosRecord = {
          ...body,
          '.id': `*${seq++}`,
          ...(route.withKey ? { 'public-key': 'bWlrcm90aWstcHVibGljLWtleS1mb3ItdGVzdC1vbmx5' } : {}),
        };
        route.rows.push(created);
        send(201, created);
        return;
      }
      if (req.method === 'PATCH') {
        const found = route.rows.find((row) => row['.id'] === itemId);
        if (!found) {
          send(404, { message: 'missing' });
          return;
        }
        Object.assign(found, body);
        send(200, found);
        return;
      }
      send(405, { message: 'method' });
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      resolve({
        port,
        store,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

describe('provisionMikrotikWireguard', () => {
  it('cria interface, endereço, peer e firewall antes do drop, e não duplica', async () => {
    const router = await startRouter();
    try {
      const rest = createMikrotikRest({
        host: '127.0.0.1',
        port: router.port,
        tls: false,
        username: 'admin',
        password: 'secret',
      });
      const params = {
        ifaceName: 'ispwg4',
        listenPort: 13231,
        ourPublicKey: 'b3VycHVibGlja2V5',
        ourAddress: '10.200.0.2',
        peerAddress: '10.200.0.1',
        prefix: 30,
        comment: 'ispconsultor-agent-4',
      };
      const first = await provisionMikrotikWireguard(rest, params);
      expect(first.peerPublicKey).toBe('bWlrcm90aWstcHVibGljLWtleS1mb3ItdGVzdC1vbmx5');
      expect(router.store.ifaces).toHaveLength(1);
      expect(router.store.addresses[0]?.address).toBe('10.200.0.1/30');
      expect(router.store.peers[0]?.['allowed-address']).toBe('10.200.0.2/32');
      const udp = router.store.filters.find((row) => row.comment === 'ispconsultor-agent-4-udp');
      expect(udp?.['place-before']).toBe('*F1');
      const putsAfterFirst = router.store.puts.length;

      const second = await provisionMikrotikWireguard(rest, { ...params, listenPort: 13232 });
      expect(second.peerPublicKey).toBe(first.peerPublicKey);
      expect(router.store.ifaces).toHaveLength(1);
      expect(router.store.ifaces[0]?.['listen-port']).toBe('13232');
      expect(router.store.peers).toHaveLength(1);
      expect(router.store.filters.filter((row) => String(row.comment).startsWith('ispconsultor-agent-4'))).toHaveLength(3);
      expect(router.store.puts.length).toBe(putsAfterFirst);
    } finally {
      await router.close();
    }
  });
});
