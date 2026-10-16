import { execFile } from 'child_process';
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const WG_HANDSHAKE_FRESH_SEC = 180;

export type CommandStep = {
  cmd: string;
  args: string[];
  allowFail?: boolean;
};

export type LocalWireguardSpec = {
  iface: string;
  privateKey: string;
  peerPublicKey: string;
  endpointHost: string;
  endpointPort: number;
  ourAddress: string;
  prefix: number;
  peerAddress: string;
  lanCidrs: string[];
  tableId: number;
  rulePriority: number;
};

export type CommandRunner = (cmd: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;

export function buildLocalWireguardSteps(spec: LocalWireguardSpec, privateKeyPath: string): CommandStep[] {
  const source = `${spec.ourAddress}/32`;
  const networkBase = spec.peerAddress.split('.').slice(0, 3).join('.');
  const fourth = Number(spec.peerAddress.split('.')[3]) - 1;
  const transitCidr = `${networkBase}.${fourth}/${spec.prefix}`;
  const allowed = [`${spec.peerAddress}/32`, ...spec.lanCidrs].join(',');
  const routes = [transitCidr, ...spec.lanCidrs];

  return [
    { cmd: 'ip', args: ['link', 'del', 'dev', spec.iface], allowFail: true },
    { cmd: 'ip', args: ['link', 'add', 'dev', spec.iface, 'type', 'wireguard'] },
    {
      cmd: 'wg',
      args: [
        'set', spec.iface,
        'private-key', privateKeyPath,
        'peer', spec.peerPublicKey,
        'endpoint', `${spec.endpointHost}:${spec.endpointPort}`,
        'allowed-ips', allowed,
        'persistent-keepalive', '25',
      ],
    },
    { cmd: 'ip', args: ['addr', 'add', `${spec.ourAddress}/${spec.prefix}`, 'dev', spec.iface] },
    { cmd: 'ip', args: ['link', 'set', 'up', 'dev', spec.iface] },
    { cmd: 'sysctl', args: ['-w', `net.ipv4.conf.${spec.iface}.rp_filter=2`], allowFail: true },
    { cmd: 'ip', args: ['rule', 'del', 'from', source, 'lookup', String(spec.tableId)], allowFail: true },
    {
      cmd: 'ip',
      args: ['rule', 'add', 'from', source, 'lookup', String(spec.tableId), 'priority', String(spec.rulePriority)],
    },
    { cmd: 'ip', args: ['route', 'flush', 'table', String(spec.tableId)], allowFail: true },
    ...routes.map((cidr) => ({
      cmd: 'ip',
      args: ['route', 'replace', cidr, 'dev', spec.iface, 'table', String(spec.tableId)],
    })),
  ];
}

async function defaultRunner(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync(cmd, args, { timeout: 15_000 });
  return { stdout: String(result.stdout ?? ''), stderr: String(result.stderr ?? '') };
}

export async function applyLocalWireguard(
  spec: LocalWireguardSpec,
  run: CommandRunner = defaultRunner
): Promise<void> {
  const keyPath = path.join(os.tmpdir(), `ispwg-${randomBytes(8).toString('hex')}.key`);
  await fs.writeFile(keyPath, spec.privateKey, { mode: 0o600 });
  try {
    const steps = buildLocalWireguardSteps(spec, keyPath);
    for (const step of steps) {
      try {
        await run(step.cmd, step.args);
      } catch (err) {
        if (step.allowFail) continue;
        const message = err instanceof Error ? err.message : String(err);
        if (/EPERM|EACCES|operation not permitted|Permission denied/i.test(message)) {
          throw new Error('O servidor precisa do pacote wireguard e permissão para criar interfaces (CAP_NET_ADMIN).');
        }
        throw new Error(`Falha ao configurar a interface local (${step.cmd}): ${message}`);
      }
    }
  } finally {
    await fs.unlink(keyPath).catch(() => undefined);
  }
}

export async function removeLocalWireguard(iface: string, ourAddress: string, tableId: number, run: CommandRunner = defaultRunner): Promise<void> {
  const steps: CommandStep[] = [
    { cmd: 'ip', args: ['rule', 'del', 'from', `${ourAddress}/32`, 'lookup', String(tableId)], allowFail: true },
    { cmd: 'ip', args: ['route', 'flush', 'table', String(tableId)], allowFail: true },
    { cmd: 'ip', args: ['link', 'del', 'dev', iface], allowFail: true },
  ];
  for (const step of steps) {
    try {
      await run(step.cmd, step.args);
    } catch {
      if (!step.allowFail) throw new Error(`Falha ao remover a interface ${iface}`);
    }
  }
}

/** `wg show all dump`: linha do peer tem o handshake na 6ª coluna. */
export function parseWgDump(text: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of text.split(/\r?\n/)) {
    const cols = line.split('\t');
    if (cols.length < 6) continue;
    const iface = cols[0] ?? '';
    const handshake = Number(cols[5]);
    if (!iface || !Number.isFinite(handshake)) continue;
    const prev = map.get(iface) ?? 0;
    if (handshake > prev) map.set(iface, handshake);
  }
  return map;
}

export function isWireguardHandshakeFresh(unixSec: number | null, nowSec = Math.floor(Date.now() / 1000)): boolean {
  if (!unixSec || unixSec <= 0) return false;
  return nowSec - unixSec <= WG_HANDSHAKE_FRESH_SEC;
}

export async function readAllHandshakes(run: CommandRunner = defaultRunner): Promise<Map<string, number>> {
  const { stdout } = await run('wg', ['show', 'all', 'dump']);
  return parseWgDump(stdout);
}
