import { asRecord, asRecords, MikrotikRest, RosRecord } from './mikrotikRest';

export type MikrotikWireguardParams = {
  ifaceName: string;
  listenPort: number;
  ourPublicKey: string;
  ourAddress: string;
  peerAddress: string;
  prefix: number;
  comment: string;
};

function idOf(record: RosRecord): string | null {
  const id = record['.id'];
  return typeof id === 'string' && id ? id : null;
}

function commentOf(record: RosRecord): string {
  return typeof record.comment === 'string' ? record.comment : '';
}

export async function provisionMikrotikWireguard(
  rest: MikrotikRest,
  params: MikrotikWireguardParams
): Promise<{ peerPublicKey: string }> {
  const interfaces = asRecords(await rest.get('/rest/interface/wireguard'));
  let iface = interfaces.find((row) => row.name === params.ifaceName);
  if (!iface) {
    iface = asRecord(await rest.put('/rest/interface/wireguard', {
      name: params.ifaceName,
      'listen-port': String(params.listenPort),
      comment: params.comment,
    }));
  } else if (String(iface['listen-port'] ?? '') !== String(params.listenPort)) {
    const id = idOf(iface);
    if (!id) throw new Error('Interface WireGuard do MikroTik sem identificador');
    iface = asRecord(await rest.patch(`/rest/interface/wireguard/${encodeURIComponent(id)}`, {
      'listen-port': String(params.listenPort),
    }));
  }

  let peerPublicKey = typeof iface['public-key'] === 'string' ? iface['public-key'] : '';
  if (!peerPublicKey) {
    const again = asRecords(await rest.get('/rest/interface/wireguard'));
    const refreshed = again.find((row) => row.name === params.ifaceName);
    peerPublicKey = typeof refreshed?.['public-key'] === 'string' ? refreshed['public-key'] : '';
  }
  if (!peerPublicKey) {
    throw new Error('MikroTik não devolveu a chave pública WireGuard');
  }

  const addresses = asRecords(await rest.get('/rest/ip/address'));
  const hasAddress = addresses.some(
    (row) => row.interface === params.ifaceName && String(row.address ?? '').startsWith(`${params.peerAddress}/`)
  );
  if (!hasAddress) {
    await rest.put('/rest/ip/address', {
      address: `${params.peerAddress}/${params.prefix}`,
      interface: params.ifaceName,
      comment: params.comment,
    });
  }

  const peers = asRecords(await rest.get('/rest/interface/wireguard/peers'));
  const peerBody: RosRecord = {
    interface: params.ifaceName,
    'public-key': params.ourPublicKey,
    'allowed-address': `${params.ourAddress}/32`,
    comment: params.comment,
  };
  const peer = peers.find(
    (row) => row.interface === params.ifaceName
      && (commentOf(row) === params.comment || row['public-key'] === params.ourPublicKey)
  );
  if (!peer) {
    await rest.put('/rest/interface/wireguard/peers', peerBody);
  } else {
    const id = idOf(peer);
    if (!id) throw new Error('Peer WireGuard do MikroTik sem identificador');
    await rest.patch(`/rest/interface/wireguard/peers/${encodeURIComponent(id)}`, peerBody);
  }

  const filters = asRecords(await rest.get('/rest/ip/firewall/filter'));
  const rules: RosRecord[] = [
    {
      chain: 'input',
      action: 'accept',
      protocol: 'udp',
      'dst-port': String(params.listenPort),
      comment: `${params.comment}-udp`,
    },
    {
      chain: 'forward',
      action: 'accept',
      'in-interface': params.ifaceName,
      comment: `${params.comment}-fwd-in`,
    },
    {
      chain: 'forward',
      action: 'accept',
      'out-interface': params.ifaceName,
      comment: `${params.comment}-fwd-out`,
    },
  ];
  const anchor = filters.find((row) => !commentOf(row).startsWith(params.comment));
  const placeBefore = anchor ? idOf(anchor) : null;
  for (const rule of rules) {
    if (filters.some((row) => commentOf(row) === rule.comment)) continue;
    await rest.put('/rest/ip/firewall/filter', {
      ...rule,
      ...(placeBefore ? { 'place-before': placeBefore } : {}),
    });
  }

  return { peerPublicKey };
}
