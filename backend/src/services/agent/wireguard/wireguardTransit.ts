const TRANSIT_BASE = { octet2: 200 };
const MAX_AGENT_ID = 16383;

export type WireguardTransit = {
  peerAddress: string;
  ourAddress: string;
  prefix: 30;
  network: string;
};

/** /30 em 10.200.0.0/16, um por agente. .1 no MikroTik, .2 no ISP Consultor. */
export function transitForAgent(agentId: number): WireguardTransit {
  if (!Number.isInteger(agentId) || agentId < 1 || agentId > MAX_AGENT_ID) {
    throw new Error('Identificador do agente fora da faixa de túneis WireGuard');
  }
  const base = (agentId - 1) * 4;
  const third = Math.floor(base / 256);
  const fourth = base % 256;
  return {
    network: `10.${TRANSIT_BASE.octet2}.${third}.${fourth}`,
    peerAddress: `10.${TRANSIT_BASE.octet2}.${third}.${fourth + 1}`,
    ourAddress: `10.${TRANSIT_BASE.octet2}.${third}.${fourth + 2}`,
    prefix: 30,
  };
}

export function interfaceNameForAgent(agentId: number): string {
  const name = `ispwg${agentId}`;
  if (name.length > 15) {
    throw new Error('Nome da interface WireGuard excede o limite do sistema');
  }
  return name;
}

export function routingTableId(agentId: number): number {
  return 10000 + agentId;
}

export function rulePriority(agentId: number): number {
  if (agentId > 30000) {
    throw new Error('Identificador do agente acima do limite de regras de rota');
  }
  return 1000 + agentId;
}

const IPV4 = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map((p) => Number(p));
  return (((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0);
}

/** True quando a rede informada cruza 10.200.0.0/16 (trânsito dos túneis). */
export function cidrOverlapsTransit(cidr: string): boolean {
  const [ip, prefixRaw] = cidr.split('/');
  const prefix = Number(prefixRaw);
  if (!ip || !IPV4.test(ip) || !Number.isInteger(prefix)) return false;
  const overlapPrefix = Math.min(prefix, 16);
  const overlapMask = overlapPrefix === 0 ? 0 : (0xffffffff << (32 - overlapPrefix)) >>> 0;
  const network = ipv4ToInt(ip);
  const transit = ipv4ToInt('10.200.0.0');
  return (network & overlapMask) === (transit & overlapMask);
}

export function parseLanCidrs(raw: string): string[] {
  const parts = raw.split(/[,\s]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    throw new Error('Informe ao menos uma rede LAN (ex.: 192.168.88.0/24)');
  }
  const seen = new Set<string>();
  for (const cidr of parts) {
    const match = cidr.match(/^([^/]+)\/(\d{1,2})$/);
    if (!match || !IPV4.test(match[1]!) ) {
      throw new Error(`Rede inválida: ${cidr}`);
    }
    const prefix = Number(match[2]);
    if (prefix < 1 || prefix > 32) {
      throw new Error(`Prefixo inválido: ${cidr}`);
    }
    if (cidrOverlapsTransit(cidr)) {
      throw new Error(`A rede ${cidr} usa a faixa de trânsito 10.200.0.0/16`);
    }
    seen.add(cidr);
  }
  return [...seen];
}

const HOST = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}|[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/;

export function assertEndpointHost(host: string): string {
  const trimmed = host.trim();
  if (!HOST.test(trimmed) || trimmed.length > 255) {
    throw new Error('Host do MikroTik inválido');
  }
  return trimmed;
}
