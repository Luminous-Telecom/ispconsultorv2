/**
 * Provisioning RPKI (RFC 8183) — certificados, chaves e CMS são gerenciados pelo Krill.
 * BackNet apenas parseia XML, persiste metadados no banco e delega operações à API Krill.
 */
import { RpkiCa } from '../../../models/rpki/RpkiCa';
import { RpkiCaParent } from '../../../models/rpki/RpkiCaParent';
import { RpkiCaResource } from '../../../models/rpki/RpkiCaResource';
import { RpkiRepository } from '../../../models/rpki/RpkiRepository';
import { RpkiClientError } from '../../../utils/errorUtils';
import { KrillApiService } from '../KrillApiService';
import {
  extractResourcesFromParentStatuses,
  injectPublicationReferralIntoPublisherRequest,
} from '../KrillSyncService';

interface ParentResponseData {
  serviceUri: string;
  parentHandle: string;
  childHandle: string;
  asnResources: string[];
  ipv4Resources: string[];
  ipv6Resources: string[];
  publicationReferrer: string | null;
  publicationReferralTokenBase64: string | null;
}

interface RepositoryResponseData {
  serviceUri: string;
  publisherHandle: string;
  siaBase: string;
  rrdpNotificationUri: string | null;
}

interface UpDownListResponseClass {
  className: string;
  certUrl: string;
  resourceSetAs: string;
  resourceSetIpv4: string;
  resourceSetIpv6: string;
}

interface UpDownListResponseData {
  asnResources: string[];
  ipv4Resources: string[];
  ipv6Resources: string[];
  classes: UpDownListResponseClass[];
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&');
}

function normalizeIncomingXml(input: string): string {
  let value = input.replace(/^\uFEFF/, '').trim();
  value = value.replace(/^```[a-zA-Z]*\s*/g, '').replace(/\s*```$/g, '').trim();

  for (let i = 0; i < 3; i += 1) {
    const decoded = decodeXmlEntities(value);
    if (decoded === value) break;
    value = decoded;
  }

  return value.trim();
}

function extractAttr(attrs: string, name: string): string {
  const quoted = attrs.match(new RegExp(`\\b${name}=(?:"([^"]+)"|'([^']+)')`, 'i'));
  if (quoted?.[1] || quoted?.[2]) {
    return quoted?.[1] ?? quoted?.[2] ?? '';
  }
  const bare = attrs.match(new RegExp(`\\b${name}=([^\\s>]+)`, 'i'));
  return bare?.[1]?.replace(/^["']|["']$/g, '') ?? '';
}

function normalizeReferralElementBody(raw: string): string {
  let s = raw.trim();
  const cdata = s.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i);
  if (cdata) {
    s = cdata[1].trim();
  }
  s = decodeXmlEntities(s);
  return s.replace(/\s+/g, '').trim();
}

function isLikelyBase64Token(value: string): boolean {
  if (value.length < 16) return false;
  return /^[A-Za-z0-9+/]+=*$/.test(value);
}

/** Quando o corpo do referral tem texto extra, tenta isolar o maior bloco Base64 (CMS). */
function extractLongestBase64Run(text: string): string | null {
  const compact = text.replace(/\s+/g, '');
  const re = /[A-Za-z0-9+/]{32,}={0,2}/g;
  let best = '';
  for (const m of compact.matchAll(re)) {
    if (m[0].length > best.length) best = m[0];
  }
  return best.length >= 32 && isLikelyBase64Token(best) ? best : null;
}

function escapeRegExpLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Remove prefixos tipo `rpki:` em nomes de elementos (default xmlns / qualified names). */
function stripQualifiedXmlElementPrefixes(xml: string): string {
  return xml
    .replace(/<([\w.-]+):([\w.-]+)\b/g, '<$2')
    .replace(/<\/([\w.-]+):([\w.-]+)\s*>/gi, '</$2>');
}

function extractPublicationReferralInner(normalized: string): {
  referrer: string;
  tokenBase64: string;
} | null {
  const tagLocalNames = ['referral', 'publication-referral', 'publication_referral'] as const;

  for (const local of tagLocalNames) {
    const escaped = escapeRegExpLiteral(local);

    const selfCloseRe = new RegExp(`<(?:[\\w.-]+:)?${escaped}\\b([^>]*)/\\s*>`, 'gi');
    for (const sc of normalized.matchAll(selfCloseRe)) {
      const attrs = String(sc[1] ?? '');
      const referrer = extractAttr(attrs, 'referrer').trim();
      const tokenAttr =
        extractAttr(attrs, 'token').trim() ||
        extractAttr(attrs, 'value').trim() ||
        extractAttr(attrs, 'authorization').trim();
      if (referrer && tokenAttr) {
        const compact = tokenAttr.replace(/\s+/g, '');
        if (isLikelyBase64Token(compact)) {
          return { referrer, tokenBase64: compact };
        }
      }
    }

    const openRe = new RegExp(`<(?:[\\w.-]+:)?${escaped}\\b([^>]*)>`, 'gi');
    for (const openMatch of normalized.matchAll(openRe)) {
      const openFull = openMatch[0];
      const attrs = String(openMatch[1] ?? '');
      const startIdx = (openMatch.index ?? 0) + openFull.length;

      const closeRe = new RegExp(`<\\/(?:[\\w.-]+:)?${escaped}\\s*>`, 'gi');
      closeRe.lastIndex = startIdx;
      const closeMatch = closeRe.exec(normalized);
      if (!closeMatch || closeMatch.index == null) continue;

      const inner = normalized.slice(startIdx, closeMatch.index);
      const referrer = extractAttr(attrs, 'referrer').trim();
      let tokenBase64 = normalizeReferralElementBody(inner);
      if (!isLikelyBase64Token(tokenBase64)) {
        const extracted = extractLongestBase64Run(inner);
        if (extracted) tokenBase64 = extracted;
      }
      if (referrer && tokenBase64 && isLikelyBase64Token(tokenBase64)) {
        return { referrer, tokenBase64 };
      }
    }
  }
  return null;
}

/**
 * Extrai o primeiro <referral> válido do parent_response (RFC 8183).
 * Tolera CDATA, prefixos XML e fechamento com prefixo diferente da abertura.
 */
function extractPublicationReferralFromParentXml(xml: string): {
  referrer: string;
  tokenBase64: string;
} | null {
  const normalized = normalizeIncomingXml(xml);
  const variants = [normalized, stripQualifiedXmlElementPrefixes(normalized)];
  for (const variant of variants) {
    const hit = extractPublicationReferralInner(variant);
    if (hit) return hit;
  }
  return null;
}

function toProtocolSafeHandle(input: string): string {
  const normalized = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');

  const collapsed = normalized.length > 0 ? normalized : 'ca';
  return collapsed.slice(0, 32);
}

function parseParentResponseXml(xml: string): ParentResponseData {
  const normalizedXml = normalizeIncomingXml(xml);

  const rootMatch = normalizedXml.match(/<(?:(?:[\w.-]+):)?(?:parent_response|parent-response)\b([^>]*)\/?>/i);
  const attrs = rootMatch?.[1] ?? normalizedXml;
  const serviceUri = extractAttr(attrs, 'service_uri') || extractAttr(normalizedXml, 'service_uri');
  const parentHandle = extractAttr(attrs, 'parent_handle') || extractAttr(normalizedXml, 'parent_handle');
  const childHandle = extractAttr(attrs, 'child_handle') || extractAttr(normalizedXml, 'child_handle');

  const asnResources = Array.from(
    new Set([
      ...Array.from(normalizedXml.matchAll(/<asn(?:\b[^>]*)>([^<]+)<\/asn>/gi)).map((m) => String(m[1]).trim()),
      ...Array.from(normalizedXml.matchAll(/(?:^|[\s,;])AS(\d+)(?=$|[\s,;<])/gi)).map((m) => `AS${String(m[1]).trim()}`),
    ].filter(Boolean))
  );

  const ipv4Resources = Array.from(
    new Set(
      Array.from(
        normalizedXml.matchAll(/\b((?:\d{1,3}\.){3}\d{1,3}\/\d{1,2})\b/gi)
      ).map((m) => String(m[1]).trim())
    )
  );

  const ipv6Resources = Array.from(
    new Set(
      Array.from(
        normalizedXml.matchAll(/\b([0-9a-f:]+::?[0-9a-f:]*\/\d{1,3})\b/gi)
      ).map((m) => String(m[1]).trim())
    )
  );

  const ref = extractPublicationReferralFromParentXml(normalizedXml);

  return {
    serviceUri,
    parentHandle,
    childHandle,
    asnResources,
    ipv4Resources,
    ipv6Resources,
    publicationReferrer: ref?.referrer ?? null,
    publicationReferralTokenBase64: ref?.tokenBase64 ?? null,
  };
}

function parseRepositoryResponseXml(xml: string): RepositoryResponseData {
  const normalizedXml = normalizeIncomingXml(xml);

  const rootMatch = normalizedXml.match(
    /<(?:[\w.-]+:)?(?:repository_response|repository-response)\b([^>]*)/i
  );
  const attrs = rootMatch?.[1] ?? normalizedXml;

  const serviceUri = extractAttr(attrs, 'service_uri') || extractAttr(normalizedXml, 'service_uri');
  const publisherHandle =
    extractAttr(attrs, 'publisher_handle') || extractAttr(normalizedXml, 'publisher_handle');
  const siaBase = extractAttr(attrs, 'sia_base') || extractAttr(normalizedXml, 'sia_base');
  const rrdpRaw =
    extractAttr(attrs, 'rrdp_notification_uri') || extractAttr(normalizedXml, 'rrdp_notification_uri');

  return {
    serviceUri: serviceUri.trim(),
    publisherHandle: publisherHandle.trim(),
    siaBase: siaBase.trim(),
    rrdpNotificationUri: rrdpRaw.trim() || null,
  };
}

function mergePublicationWarning(current: string | null, extra: string): string {
  return current ? `${current} ${extra}` : extra;
}

async function syncResourcesFromParentResponse(params: {
  caId: number;
  empresaId: number | null;
  asnResources: string[];
  ipv4Resources: string[];
  ipv6Resources: string[];
}): Promise<void> {
  const upsertResource = async (resourceType: 'asn' | 'ipv4' | 'ipv6', value: string): Promise<void> => {
    const clean = value.trim();
    if (!clean) return;

    const [startRange, endRange] = clean.includes('-')
      ? clean.split('-', 2).map((part) => part.trim())
      : [clean, null];

    await RpkiCaResource.findOrCreate({
      where: {
        ca_id: params.caId,
        resource_type: resourceType,
        start_range: startRange,
      },
      defaults: {
        empresa_id: params.empresaId,
        ca_id: params.caId,
        resource_type: resourceType,
        start_range: startRange,
        end_range: endRange,
        source: 'parent',
      },
    });
  };

  for (const asn of params.asnResources) {
    await upsertResource('asn', asn);
  }
  for (const ipv4 of params.ipv4Resources) {
    await upsertResource('ipv4', ipv4);
  }
  for (const ipv6 of params.ipv6Resources) {
    await upsertResource('ipv6', ipv6);
  }
}

export class RpkiProvisioningService {
  static async syncParentResources(params: {
    ca: RpkiCa;
    parent: RpkiCaParent;
    empresaId: number | null;
  }): Promise<UpDownListResponseData> {
    const handle = params.ca.handle?.trim();
    if (!handle) throw new Error('CA sem handle para sincronização no Krill');

    await KrillApiService.ensureCa(handle);
    await KrillApiService.syncParents(handle);

    const parentStatuses = await KrillApiService.getParentStatuses(handle);
    const resources = extractResourcesFromParentStatuses(parentStatuses);

    await syncResourcesFromParentResponse({
      caId: params.ca.id,
      empresaId: params.empresaId,
      asnResources: resources.asnResources,
      ipv4Resources: resources.ipv4Resources,
      ipv6Resources: resources.ipv6Resources,
    });

    await params.ca.update({ status: 'active' });
    await params.ca.reload();

    await params.parent.update({
      provisioning_status: 'active',
      last_sync_at: new Date(),
      last_error: null,
    });

    const { RpkiSyncLog } = await import('../../../models/rpki/RpkiSyncLog');
    RpkiSyncLog.create({
      empresa_id: params.ca.empresa_id,
      ca_id: params.ca.id,
      type: 'provisioning',
      status: 'success',
      remote_host: process.env.KRILL_API_URL?.trim() || 'https://127.0.0.1:3100',
      message: `Krill: recursos sincronizados (ASN: ${resources.asnResources.length}, IPv4: ${resources.ipv4Resources.length}, IPv6: ${resources.ipv6Resources.length})`,
    }).catch(() => {});

    return {
      asnResources: resources.asnResources,
      ipv4Resources: resources.ipv4Resources,
      ipv6Resources: resources.ipv6Resources,
      classes: [],
    };
  }

  /** Krill gerencia certificados de recurso automaticamente no sync/parents. */
  static async requestResourceCert(params: {
    ca: RpkiCa;
    parent: RpkiCaParent;
  }): Promise<void> {
    await RpkiProvisioningService.syncParentResources({
      ca: params.ca,
      parent: params.parent,
      empresaId: params.ca.empresa_id,
    });
  }

  static async generateChildRequest(ca: RpkiCa): Promise<{ xml: string; ca: RpkiCa }> {
    const protocolHandle = toProtocolSafeHandle(ca.handle || ca.nome);
    if (protocolHandle !== ca.handle) {
      await ca.update({ handle: protocolHandle });
      await ca.reload();
    }

    await KrillApiService.ensureCa(protocolHandle);
    const xml = await KrillApiService.getChildRequestXml(protocolHandle);
    return { xml, ca };
  }

  static async importParentResponse(params: {
    ca: RpkiCa;
    parentName: string;
    responseXml: string;
    empresaId: number | null;
  }): Promise<RpkiCaParent> {
    const parentResponseStored = normalizeIncomingXml(params.responseXml);

    const handle = params.ca.handle?.trim();
    if (!handle) throw new RpkiClientError('CA sem handle para vincular CA-pai no Krill');

    await KrillApiService.ensureCa(handle);
    await KrillApiService.addParent(handle, params.parentName, parentResponseStored);

    const parsed = parseParentResponseXml(params.responseXml);

    const [parent, created] = await RpkiCaParent.findOrCreate({
      where: {
        ca_id: params.ca.id,
        parent_name: params.parentName,
      },
      defaults: {
        empresa_id: params.empresaId,
        ca_id: params.ca.id,
        parent_name: params.parentName,
        service_uri: parsed.serviceUri,
        parent_handle: parsed.parentHandle,
        child_handle: parsed.childHandle,
        publication_referrer: parsed.publicationReferrer,
        publication_referral_token: parsed.publicationReferralTokenBase64,
        parent_response_xml: parentResponseStored,
        provisioning_status: 'active',
        last_sync_at: new Date(),
        last_error: null,
      },
    });
    if (!created) {
      await parent.update({
        service_uri: parsed.serviceUri,
        parent_handle: parsed.parentHandle,
        child_handle: parsed.childHandle,
        publication_referrer: parsed.publicationReferrer,
        publication_referral_token: parsed.publicationReferralTokenBase64,
        parent_response_xml: parentResponseStored,
        provisioning_status: 'active',
        last_sync_at: new Date(),
        last_error: null,
      });
    }

    await syncResourcesFromParentResponse({
      caId: params.ca.id,
      empresaId: params.empresaId,
      asnResources: parsed.asnResources,
      ipv4Resources: parsed.ipv4Resources,
      ipv6Resources: parsed.ipv6Resources,
    });

    await params.ca.update({ status: 'active' });

    return parent;
  }

  static async generatePublisherRequest(params: {
    ca: RpkiCa;
    parentId?: number | null;
    tag?: string | null;
  }): Promise<{ xml: string; tag: string; ca: RpkiCa; warning: string | null }> {
    const handle = params.ca.handle?.trim();
    if (!handle) throw new RpkiClientError('CA sem handle para publisher_request');

    await KrillApiService.ensureCa(handle);
    let xml = await KrillApiService.getPublisherRequestXml(handle);

    let warning: string | null = null;
    const tag = String(params.tag ?? '').trim() || `bn-${Date.now().toString(36)}`;

    const parentId = params.parentId != null && Number.isFinite(Number(params.parentId)) ? Number(params.parentId) : 0;
    if (parentId > 0) {
      const parentRow = await RpkiCaParent.findOne({
        where: { id: parentId, ca_id: params.ca.id },
      });
      if (!parentRow) {
        throw new RpkiClientError('CA-pai não encontrada para esta CA');
      }

      let ref = parentRow.publication_referrer?.trim() ?? '';
      let tok = parentRow.publication_referral_token?.replace(/\s+/g, '').trim() ?? '';

      if (!ref || !tok) {
        const storedXml = parentRow.parent_response_xml?.trim() ?? '';
        if (storedXml) {
          const recovered = extractPublicationReferralFromParentXml(storedXml);
          if (recovered?.referrer && recovered.tokenBase64) {
            ref = recovered.referrer;
            tok = recovered.tokenBase64;
            await parentRow.update({
              publication_referrer: ref,
              publication_referral_token: tok,
            });
          }
        }
      }

      if (ref && tok) {
        xml = injectPublicationReferralIntoPublisherRequest(xml, ref, tok);
      } else {
        warning = mergePublicationWarning(
          warning,
          'CA-pai sem <referral>. Gerando publisher_request sem esse bloco (Registro.br pode rejeitar).'
        );
      }
    }

    return { xml, tag, ca: params.ca, warning };
  }

  static async importRepositoryResponse(params: {
    ca: RpkiCa;
    responseXml: string;
    empresaId: number | null;
  }): Promise<RpkiRepository> {
    const responseStored = normalizeIncomingXml(params.responseXml);

    const handle = params.ca.handle?.trim();
    if (!handle) throw new RpkiClientError('CA sem handle para configurar repositório no Krill');

    await KrillApiService.ensureCa(handle);
    await KrillApiService.configureRepository(handle, responseStored);

    const parsed = parseRepositoryResponseXml(params.responseXml);
    const repositoryName = parsed.publisherHandle || handle;

    const [row, created] = await RpkiRepository.findOrCreate({
      where: {
        ca_id: params.ca.id,
        repository_name: repositoryName,
      },
      defaults: {
        empresa_id: params.empresaId,
        ca_id: params.ca.id,
        repository_name: repositoryName,
        publication_service_uri: parsed.serviceUri,
        rsync_base_uri: parsed.siaBase,
        rrdp_notify_uri: parsed.rrdpNotificationUri,
        publication_status: 'active',
        last_publish_at: new Date(),
        last_error: null,
      },
    });

    if (!created) {
      await row.update({
        publication_service_uri: parsed.serviceUri,
        rsync_base_uri: parsed.siaBase,
        rrdp_notify_uri: parsed.rrdpNotificationUri,
        publication_status: 'active',
        last_publish_at: new Date(),
        last_error: null,
      });
    }

    await params.ca.update({ status: 'active' });

    return row;
  }
}

