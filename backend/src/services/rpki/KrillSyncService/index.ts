/**
 * Sincroniza estado local (banco) com o Krill para ROAs e ASPAs.
 */
import type { rpki_aspas, rpki_cas, rpki_repositories, rpki_roas } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { SistemaLogOperacionalService } from '../../sistema/SistemaLogOperacionalService';
import { RpkiClientError } from '../../../utils/errorUtils';
import { KrillApiService, type KrillAspaEntry, type KrillRoaEntry } from '../KrillApiService';

export function roaKey(asn: number, prefix: string, maxLength: number): string {
  return `${asn}|${prefix.trim()}|${maxLength}`;
}

export function krillEntryMaxLength(entry: KrillRoaEntry): number {
  return entry.max_length ?? parseInt(entry.prefix.split('/')[1] ?? '0', 10);
}

/** Espelha ROAs do Krill no banco local (ids estáveis para a UI). */
export async function syncRoasFromKrillToDb(caId: number): Promise<void> {
  const { ca, handle } = await resolveCaHandle(caId);
  const routes = await KrillApiService.listRoutes(handle);
  const krillKeys = new Set<string>();
  const now = new Date();
  const defaultEnd = new Date('2041-12-31');

  for (const entry of routes) {
    const maxLength = krillEntryMaxLength(entry);
    const prefix = entry.prefix.trim();
    const asn = String(entry.asn);
    krillKeys.add(roaKey(entry.asn, prefix, maxLength));

    const asnValue = BigInt(asn);
    const existing = await prisma.rpki_roas.findFirst({
      where: { ca_id: caId, prefix, asn: asnValue, max_length: maxLength },
    });
    if (!existing) {
      await prisma.rpki_roas.create({
        data: {
          empresa_id: ca.empresa_id,
          ca_id: caId,
          prefix,
          asn: asnValue,
          max_length: maxLength,
          not_before: now,
          not_after: defaultEnd,
          status: 'active',
          revoked_at: null,
        },
      });
    } else if (existing.status !== 'active' || existing.revoked_at) {
      await prisma.rpki_roas.update({
        where: { id: existing.id },
        data: { status: 'active', revoked_at: null },
      });
    }
  }

  const activeDb = await prisma.rpki_roas.findMany({ where: { ca_id: caId, status: 'active' } });
  for (const roa of activeDb) {
    const key = roaKey(parseInt(String(roa.asn), 10), roa.prefix.trim(), roa.max_length);
    if (!krillKeys.has(key)) {
      await prisma.rpki_roas.update({
        where: { id: roa.id },
        data: { status: 'revoked', revoked_at: new Date() },
      });
    }
  }
}

function dbRoaToKrill(roa: Pick<rpki_roas, 'asn' | 'prefix' | 'max_length'>): KrillRoaEntry {
  return {
    asn: parseInt(String(roa.asn), 10),
    prefix: roa.prefix.trim(),
    max_length: roa.max_length,
  };
}

function krillRoaToKey(entry: KrillRoaEntry): string {
  const maxLength = entry.max_length ?? parseInt(entry.prefix.split('/')[1] ?? '0', 10);
  return roaKey(entry.asn, entry.prefix, maxLength);
}

function dbAspaToKrill(aspa: Pick<rpki_aspas, 'customer_asn' | 'providers_json'>): KrillAspaEntry {
  const raw = aspa.providers_json;
  const providersList: string[] = Array.isArray(raw) ? raw : JSON.parse(String(raw));
  return {
    customer: parseInt(String(aspa.customer_asn), 10),
    providers: providersList.map((p) => parseInt(String(p), 10)),
  };
}

function aspaKey(customer: number, providers: number[]): string {
  return `${customer}|${[...providers].sort((a, b) => a - b).join(',')}`;
}

function dbAspaKey(aspa: Pick<rpki_aspas, 'customer_asn' | 'providers_json'>): string {
  const entry = dbAspaToKrill(aspa);
  return aspaKey(entry.customer, entry.providers);
}

/** Espelha ASPAs do Krill no banco local (ids estáveis para a UI). */
export async function syncAspasFromKrillToDb(caId: number): Promise<void> {
  const { ca, handle } = await resolveCaHandle(caId);
  const aspas = await KrillApiService.listAspas(handle);
  const krillKeys = new Set<string>();
  const now = new Date();
  const defaultEnd = new Date('2041-12-31');

  for (const entry of aspas) {
    const customerAsn = String(entry.customer);
    const providersJson = entry.providers.map(String);
    krillKeys.add(aspaKey(entry.customer, entry.providers));

    const customerValue = BigInt(customerAsn);
    let row = await prisma.rpki_aspas.findFirst({
      where: { ca_id: caId, customer_asn: customerValue },
    });
    if (!row) {
      row = await prisma.rpki_aspas.create({
        data: {
          empresa_id: ca.empresa_id,
          ca_id: caId,
          customer_asn: customerValue,
          providers_json: JSON.stringify(providersJson),
          afi: 'both',
          status: 'active',
          not_before: now,
          not_after: defaultEnd,
          revoked_at: null,
        },
      });
    }

    const currentProviders = dbAspaToKrill(row).providers.map(String).sort().join(',');
    const newProviders = providersJson.slice().sort().join(',');
    const payload: { providers_json?: string; status?: 'active'; revoked_at?: null } = {};

    if (currentProviders !== newProviders) {
      payload.providers_json = JSON.stringify(providersJson);
    }
    if (row.status !== 'active' || row.revoked_at) {
      payload.status = 'active';
      payload.revoked_at = null;
    }
    if (Object.keys(payload).length > 0) {
      await prisma.rpki_aspas.update({ where: { id: row.id }, data: payload });
    }
  }

  const activeDb = await prisma.rpki_aspas.findMany({ where: { ca_id: caId, status: 'active' } });
  for (const aspa of activeDb) {
    if (!krillKeys.has(dbAspaKey(aspa))) {
      await prisma.rpki_aspas.update({
        where: { id: aspa.id },
        data: { status: 'revoked', revoked_at: new Date() },
      });
    }
  }
}

export async function resolveCaHandle(caId: number): Promise<{ ca: rpki_cas; handle: string }> {
  const ca = await prisma.rpki_cas.findUnique({ where: { id: caId } });
  if (!ca) throw new RpkiClientError('CA não encontrada');
  const handle = ca.handle?.trim();
  if (!handle) throw new RpkiClientError('CA sem handle configurado');
  await KrillApiService.ensureCa(handle);
  return { ca, handle };
}

export async function syncKrillRoutesForCa(caId: number, triggerType?: 'roa' | 'manual' | null): Promise<void> {
  const { ca, handle } = await resolveCaHandle(caId);

  const activeRoas = await prisma.rpki_roas.findMany({
    where: { ca_id: caId, status: 'active' },
  });

  const desired = new Map<string, KrillRoaEntry>();
  for (const roa of activeRoas) {
    const entry = dbRoaToKrill(roa);
    desired.set(krillRoaToKey(entry), entry);
  }

  const current = await KrillApiService.listRoutes(handle);
  const currentMap = new Map<string, KrillRoaEntry>();
  for (const entry of current) {
    currentMap.set(krillRoaToKey(entry), entry);
  }

  const added: KrillRoaEntry[] = [];
  const removed: Array<{ asn: number; prefix: string; max_length?: number }> = [];

  for (const [key, entry] of desired) {
    if (!currentMap.has(key)) added.push(entry);
  }
  for (const [key, entry] of currentMap) {
    if (!desired.has(key)) {
      removed.push({
        asn: entry.asn,
        prefix: entry.prefix,
        max_length: entry.max_length,
      });
    }
  }

  if (added.length === 0 && removed.length === 0) return;

  await KrillApiService.updateRoutes(handle, { added, removed });
  await KrillApiService.syncRepository(handle);

  const repository = await prisma.rpki_repositories.findFirst({ where: { ca_id: caId } });
  SistemaLogOperacionalService.registrarRpkiSync({
    empresaId: ca.empresa_id,
    caId,
    type: 'publication',
    triggerType: triggerType ?? 'roa',
    status: 'success',
    remoteHost: process.env.KRILL_API_URL?.trim() || 'https://127.0.0.1:3100',
    message: `Krill: ROAs sincronizadas (+${added.length}, -${removed.length})`,
  });

  if (repository) {
    await prisma.rpki_repositories.update({
      where: { id: repository.id },
      data: { publication_status: 'active', last_publish_at: new Date(), last_error: null },
    });
  }
}

export async function syncKrillAspasForCa(caId: number, triggerType?: 'aspa' | 'manual' | null): Promise<void> {
  const { ca, handle } = await resolveCaHandle(caId);

  const activeAspas = await prisma.rpki_aspas.findMany({
    where: { ca_id: caId, status: 'active' },
  });

  const desired = new Map<string, KrillAspaEntry>();
  for (const aspa of activeAspas) {
    const entry = dbAspaToKrill(aspa);
    desired.set(aspaKey(entry.customer, entry.providers), entry);
  }

  const current = await KrillApiService.listAspas(handle);
  const currentMap = new Map<string, KrillAspaEntry>();
  for (const entry of current) {
    currentMap.set(aspaKey(entry.customer, entry.providers), entry);
  }

  const addOrReplace: KrillAspaEntry[] = [];
  const remove: number[] = [];

  for (const [key, entry] of desired) {
    if (!currentMap.has(key)) addOrReplace.push(entry);
  }
  for (const [key, entry] of currentMap) {
    if (!desired.has(key)) remove.push(entry.customer);
  }

  if (addOrReplace.length === 0 && remove.length === 0) return;

  await KrillApiService.updateAspas(handle, { add_or_replace: addOrReplace, remove });
  await KrillApiService.syncRepository(handle);

  const repository = await prisma.rpki_repositories.findFirst({ where: { ca_id: caId } });
  SistemaLogOperacionalService.registrarRpkiSync({
    empresaId: ca.empresa_id,
    caId,
    type: 'publication',
    triggerType: triggerType ?? 'aspa',
    status: 'success',
    remoteHost: process.env.KRILL_API_URL?.trim() || 'https://127.0.0.1:3100',
    message: `Krill: ASPAs sincronizados (+${addOrReplace.length}, -${remove.length})`,
  });

  if (repository) {
    await prisma.rpki_repositories.update({
      where: { id: repository.id },
      data: { publication_status: 'active', last_publish_at: new Date(), last_error: null },
    });
  }
}

export async function syncKrillRepositoryForCa(
  caId: number,
  repositoryId: number,
  triggerType?: 'roa' | 'aspa' | 'manual' | null
): Promise<rpki_repositories> {
  const { ca, handle } = await resolveCaHandle(caId);

  await syncKrillRoutesForCa(caId, triggerType === 'roa' ? 'roa' : 'manual');
  await syncKrillAspasForCa(caId, triggerType === 'aspa' ? 'aspa' : 'manual');
  await KrillApiService.syncRepository(handle);

  const repository = await prisma.rpki_repositories.findFirst({ where: { id: repositoryId, ca_id: caId } });
  if (!repository) throw new RpkiClientError('Repositório não encontrado');

  const status = await KrillApiService.getRepoStatus(handle);
  const lastResult = status.last_exchange?.result?.toLowerCase();
  const hasFailure = lastResult != null && lastResult !== 'success';

  const updated = await prisma.rpki_repositories.update({
    where: { id: repository.id },
    data: {
      publication_status: hasFailure ? 'error' : 'active',
      last_publish_at: new Date(),
      last_error: hasFailure ? `Krill repo sync: ${status.last_exchange?.result ?? 'failure'}` : null,
    },
  });

  SistemaLogOperacionalService.registrarRpkiSync({
    empresaId: ca.empresa_id,
    caId,
    type: 'publication',
    triggerType: triggerType ?? 'manual',
    status: hasFailure ? 'failed' : 'success',
    remoteHost: process.env.KRILL_API_URL?.trim() || 'https://127.0.0.1:3100',
    message: hasFailure
      ? `Krill: falha na sincronização do repositório (${status.last_exchange?.result ?? 'unknown'})`
      : 'Krill: repositório sincronizado com sucesso',
  });

  return updated;
}

/** Extrai recursos IPv4/IPv6/ASN do status de parents do Krill. */
export function extractResourcesFromParentStatuses(
  statuses: Record<string, import('../KrillApiService').KrillParentStatus>
): { asnResources: string[]; ipv4Resources: string[]; ipv6Resources: string[] } {
  const asnSet = new Set<string>();
  const ipv4Set = new Set<string>();
  const ipv6Set = new Set<string>();

  const addFromResourceString = (type: 'asn' | 'ipv4' | 'ipv6', raw?: string) => {
    if (!raw?.trim()) return;
    for (const part of raw.split(',').map((p) => p.trim()).filter(Boolean)) {
      if (part.toLowerCase() === 'inherit') continue;
      if (type === 'asn') asnSet.add(part.toUpperCase().startsWith('AS') ? part.toUpperCase() : `AS${part}`);
      if (type === 'ipv4') ipv4Set.add(part);
      if (type === 'ipv6') ipv6Set.add(part);
    }
  };

  for (const status of Object.values(statuses)) {
    addFromResourceString('asn', status.all_resources?.asn);
    addFromResourceString('ipv4', status.all_resources?.ipv4);
    addFromResourceString('ipv6', status.all_resources?.ipv6);
    for (const cls of status.classes ?? []) {
      addFromResourceString('asn', cls.resource_set?.asn);
      addFromResourceString('ipv4', cls.resource_set?.ipv4);
      addFromResourceString('ipv6', cls.resource_set?.ipv6);
    }
  }

  return {
    asnResources: [...asnSet],
    ipv4Resources: [...ipv4Set],
    ipv6Resources: [...ipv6Set],
  };
}

export function injectPublicationReferralIntoPublisherRequest(
  publisherXml: string,
  referrer: string,
  tokenBase64: string
): string {
  if (publisherXml.includes('<referral')) return publisherXml;

  const compactToken = tokenBase64.replace(/\s+/g, '');
  const referralBlock =
    `\n  <referral referrer="${referrer.replace(/"/g, '&quot;')}">\n` +
    `${compactToken}\n` +
    `  </referral>`;

  const closingTag = '</publisher_request>';
  const idx = publisherXml.lastIndexOf(closingTag);
  if (idx === -1) return publisherXml;
  return publisherXml.slice(0, idx) + referralBlock + '\n' + closingTag;
}
