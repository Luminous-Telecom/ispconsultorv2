import { Agent } from '../../../models/agent/Agent';
import { encrypt, decryptSshCredential } from '../../../utils/encryption';
import { logger } from '../../../utils/logger';
import { createMikrotikRest } from './mikrotikRest';
import { provisionMikrotikWireguard } from './mikrotikWireguardProvision';
import {
  applyLocalWireguard,
  isWireguardHandshakeFresh,
  readAllHandshakes,
  removeLocalWireguard,
} from './wireguardLocal';
import { generateWireguardKeyPair } from './wireguardKeys';
import {
  assertEndpointHost,
  interfaceNameForAgent,
  parseLanCidrs,
  routingTableId,
  rulePriority,
  transitForAgent,
} from './wireguardTransit';

export type WireguardProvisionInput = {
  mikrotikHost: string;
  mikrotikApiPort: number;
  mikrotikApiTls: boolean;
  mikrotikUsername: string;
  mikrotikPassword?: string;
  listenPort: number;
  lanCidrs: string;
};

const HANDSHAKE_WAIT_MS = 8_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isWireguardAgent(agent: { connection_mode?: string | null }): boolean {
  return agent.connection_mode === 'wireguard';
}

async function handshakeOf(iface: string): Promise<number | null> {
  try {
    const map = await readAllHandshakes();
    return map.get(iface) ?? null;
  } catch (err) {
    logger.warn('WireGuard: não foi possível ler o handshake', {
      iface,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function readWireguardHandshakes(): Promise<Map<string, number>> {
  try {
    return await readAllHandshakes();
  } catch {
    return new Map();
  }
}

export function handshakeUnixForAgent(agent: Agent, live: Map<string, number>): number | null {
  if (agent.wg_interface_name && live.has(agent.wg_interface_name)) {
    return live.get(agent.wg_interface_name) ?? null;
  }
  if (agent.wg_last_handshake_at) {
    return Math.floor(agent.wg_last_handshake_at.getTime() / 1000);
  }
  return null;
}

export function wireguardAgentOnline(agent: Agent, live: Map<string, number>, nowSec = Math.floor(Date.now() / 1000)): boolean {
  if (!agent.is_active || !isWireguardAgent(agent)) return false;
  return isWireguardHandshakeFresh(handshakeUnixForAgent(agent, live), nowSec);
}

/** Endereço de origem do SSH quando o túnel está com handshake recente. */
export async function resolveWireguardBind(agent: Agent): Promise<string> {
  if (!isWireguardAgent(agent)) {
    throw new Error('Agente não usa VPN WireGuard');
  }
  if (!agent.wg_address_ours || !agent.wg_interface_name || agent.wg_status === 'idle') {
    throw new Error('VPN WireGuard ainda não configurada neste agente.');
  }
  const handshake = await handshakeOf(agent.wg_interface_name);
  if (!isWireguardHandshakeFresh(handshake)) {
    throw new Error('VPN WireGuard sem handshake. Confira se a porta UDP do MikroTik está acessível.');
  }
  if (handshake) {
    await agent.update({
      wg_last_handshake_at: new Date(handshake * 1000),
      last_seen_at: new Date(),
      wg_status: 'up',
      wg_last_error: null,
    });
  }
  return agent.wg_address_ours;
}

function resolvePassword(agent: Agent, provided?: string): string {
  const typed = provided?.trim() ?? '';
  if (typed) return typed;
  if (!agent.mikrotik_password) {
    throw new Error('Informe a senha da API do MikroTik');
  }
  return decryptSshCredential(agent.mikrotik_password, 'senha');
}

export async function provisionAgentWireguard(agent: Agent, input: WireguardProvisionInput): Promise<{ up: boolean; message: string }> {
  const host = assertEndpointHost(input.mikrotikHost);
  const lanCidrs = parseLanCidrs(input.lanCidrs);
  const password = resolvePassword(agent, input.mikrotikPassword);
  const transit = transitForAgent(agent.id);
  const iface = interfaceNameForAgent(agent.id);
  const comment = `ispconsultor-agent-${agent.id}`;

  let privateKey = '';
  let publicKey = '';
  if (agent.wg_our_private_key && agent.wg_our_public_key) {
    privateKey = decryptSshCredential(agent.wg_our_private_key, 'chave_privada');
    publicKey = agent.wg_our_public_key;
  } else {
    const generated = generateWireguardKeyPair();
    privateKey = generated.privateKey;
    publicKey = generated.publicKey;
  }

  const rest = createMikrotikRest({
    host,
    port: input.mikrotikApiPort,
    tls: input.mikrotikApiTls,
    username: input.mikrotikUsername.trim(),
    password,
  });

  let peerPublicKey = '';
  try {
    const provisioned = await provisionMikrotikWireguard(rest, {
      ifaceName: iface,
      listenPort: input.listenPort,
      ourPublicKey: publicKey,
      ourAddress: transit.ourAddress,
      peerAddress: transit.peerAddress,
      prefix: transit.prefix,
      comment,
    });
    peerPublicKey = provisioned.peerPublicKey;
    await applyLocalWireguard({
      iface,
      privateKey,
      peerPublicKey,
      endpointHost: host,
      endpointPort: input.listenPort,
      ourAddress: transit.ourAddress,
      prefix: transit.prefix,
      peerAddress: transit.peerAddress,
      lanCidrs,
      tableId: routingTableId(agent.id),
      rulePriority: rulePriority(agent.id),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await agent.update({
      connection_mode: 'wireguard',
      mikrotik_host: host,
      mikrotik_api_port: input.mikrotikApiPort,
      mikrotik_api_tls: input.mikrotikApiTls,
      mikrotik_username: input.mikrotikUsername.trim(),
      mikrotik_password: encrypt(password),
      wg_listen_port: input.listenPort,
      wg_lan_cidrs: lanCidrs.join(', '),
      wg_interface_name: iface,
      wg_our_public_key: publicKey,
      wg_our_private_key: encrypt(privateKey),
      wg_peer_public_key: peerPublicKey || agent.wg_peer_public_key,
      wg_address_ours: transit.ourAddress,
      wg_address_peer: transit.peerAddress,
      wg_status: 'error',
      wg_last_error: message.slice(0, 500),
    });
    throw new Error(message);
  }

  const deadline = Date.now() + HANDSHAKE_WAIT_MS;
  let handshake: number | null = null;
  while (Date.now() < deadline) {
    handshake = await handshakeOf(iface);
    if (isWireguardHandshakeFresh(handshake)) break;
    await sleep(500);
  }

  const up = isWireguardHandshakeFresh(handshake);
  const error = up ? null : 'Túnel criado no MikroTik, sem handshake. Confira se a porta UDP está acessível na internet.';
  await agent.update({
    connection_mode: 'wireguard',
    mikrotik_host: host,
    mikrotik_api_port: input.mikrotikApiPort,
    mikrotik_api_tls: input.mikrotikApiTls,
    mikrotik_username: input.mikrotikUsername.trim(),
    mikrotik_password: encrypt(password),
    wg_listen_port: input.listenPort,
    wg_lan_cidrs: lanCidrs.join(', '),
    wg_interface_name: iface,
    wg_our_public_key: publicKey,
    wg_our_private_key: encrypt(privateKey),
    wg_peer_public_key: peerPublicKey,
    wg_address_ours: transit.ourAddress,
    wg_address_peer: transit.peerAddress,
    wg_status: up ? 'up' : 'error',
    wg_last_handshake_at: handshake ? new Date(handshake * 1000) : null,
    last_seen_at: up ? new Date() : agent.last_seen_at,
    wg_last_error: error,
  });

  if (!up) {
    return { up: false, message: error ?? 'VPN WireGuard sem handshake' };
  }
  return { up: true, message: 'VPN WireGuard configurada.' };
}

export async function testAgentWireguard(agent: Agent): Promise<{ success: boolean; latency: number | null; error: string | null }> {
  if (!agent.wg_interface_name) {
    return { success: false, latency: null, error: 'VPN WireGuard ainda não configurada neste agente.' };
  }
  const started = Date.now();
  const handshake = await handshakeOf(agent.wg_interface_name);
  if (!isWireguardHandshakeFresh(handshake)) {
    await agent.update({ wg_status: 'error', wg_last_error: 'Sem handshake WireGuard' });
    return {
      success: false,
      latency: null,
      error: 'VPN WireGuard sem handshake. Confira se a porta UDP do MikroTik está acessível.',
    };
  }
  await agent.update({
    wg_status: 'up',
    wg_last_error: null,
    wg_last_handshake_at: new Date((handshake ?? 0) * 1000),
    last_seen_at: new Date(),
  });
  return { success: true, latency: Date.now() - started, error: null };
}

export async function teardownAgentWireguard(agent: Agent): Promise<void> {
  if (!agent.wg_interface_name || !agent.wg_address_ours) return;
  try {
    await removeLocalWireguard(agent.wg_interface_name, agent.wg_address_ours, routingTableId(agent.id));
  } catch (err) {
    logger.warn('WireGuard: falha ao remover interface local', {
      agentId: agent.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
