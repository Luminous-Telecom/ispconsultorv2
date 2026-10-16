import { execFile } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateWireguardKeyPair } from '../wireguardKeys';
import { applyLocalWireguard, readAllHandshakes, removeLocalWireguard } from '../wireguardLocal';

const execFileAsync = promisify(execFile);

const SERVER_IFACE = 'ispwgls';
const CLIENT_IFACE = 'ispwglc';
const PORT = 51855;
const SERVER_ADDR = '10.254.251.1';
const CLIENT_ADDR = '10.254.251.2';
const TABLE = 40055;

async function run(cmd: string, args: string[]): Promise<void> {
  await execFileAsync(cmd, args);
}

describe('túnel WireGuard local', () => {
  it('completa o handshake e alcança o peer pelo endereço de origem da VPN', async () => {
    const server = generateWireguardKeyPair();
    const client = generateWireguardKeyPair();
    const keyPath = path.join(os.tmpdir(), 'ispwgls.key');
    await fs.writeFile(keyPath, server.privateKey, { mode: 0o600 });
    try {
      await run('ip', ['link', 'del', 'dev', SERVER_IFACE]).catch(() => undefined);
      await run('ip', ['link', 'del', 'dev', CLIENT_IFACE]).catch(() => undefined);
      await run('ip', ['link', 'add', 'dev', SERVER_IFACE, 'type', 'wireguard']);
      await run('wg', [
        'set', SERVER_IFACE,
        'listen-port', String(PORT),
        'private-key', keyPath,
        'peer', client.publicKey,
        'allowed-ips', `${CLIENT_ADDR}/32`,
      ]);
      await run('ip', ['addr', 'add', `${SERVER_ADDR}/30`, 'dev', SERVER_IFACE]);
      await run('ip', ['link', 'set', 'up', 'dev', SERVER_IFACE]);

      await applyLocalWireguard({
        iface: CLIENT_IFACE,
        privateKey: client.privateKey,
        peerPublicKey: server.publicKey,
        endpointHost: '127.0.0.1',
        endpointPort: PORT,
        ourAddress: CLIENT_ADDR,
        prefix: 30,
        peerAddress: SERVER_ADDR,
        lanCidrs: ['192.0.2.0/24'],
        tableId: TABLE,
        rulePriority: 32055,
      });

      let fresh = false;
      for (let i = 0; i < 10; i += 1) {
        await execFileAsync('ping', ['-c', '1', '-W', '1', '-I', CLIENT_ADDR, SERVER_ADDR]).catch(() => undefined);
        const handshakes = await readAllHandshakes();
        const unix = handshakes.get(CLIENT_IFACE) ?? 0;
        if (unix > 0) {
          fresh = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      expect(fresh).toBe(true);
      await execFileAsync('ping', ['-c', '1', '-W', '2', '-I', CLIENT_ADDR, SERVER_ADDR]);
    } finally {
      await fs.unlink(keyPath).catch(() => undefined);
      await removeLocalWireguard(CLIENT_IFACE, CLIENT_ADDR, TABLE).catch(() => undefined);
      await run('ip', ['link', 'del', 'dev', SERVER_IFACE]).catch(() => undefined);
    }
  }, 20_000);
});
