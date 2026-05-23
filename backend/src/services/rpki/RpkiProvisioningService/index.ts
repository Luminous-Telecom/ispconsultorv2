import forge from 'node-forge';
import axios from 'axios';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { RpkiCa } from '../../../models/rpki/RpkiCa';
import { RpkiCaParent } from '../../../models/rpki/RpkiCaParent';
import { RpkiCaResource } from '../../../models/rpki/RpkiCaResource';
import { RpkiRepository } from '../../../models/rpki/RpkiRepository';
import { logger } from '../../../utils/logger';
import { RpkiClientError } from '../../../utils/errorUtils';
import {
  hasKrillStyleIdCertTa,
  issueIdCertTa,
  signKrillIdCertCms,
} from '../RpkiIdCert';
export { encodeCmsSignedDataCrlsField, injectRpkiCrlFieldIntoSignedDataCms } from '../RpkiCmsCrl';
export { generateBpkiCrlDer } from '../RpkiIdCert';

const execFileAsync = promisify(execFile);
const RFC8183 = 'http://www.hactrn.net/uris/rpki/rpki-setup/';
const isRpkiDebugCmsEnabled = String(process.env.RPKI_DEBUG_CMS ?? '').toLowerCase() === 'true';

/** Headers extras para HTTP RPKI (Up/Down). Defina RPKI_HTTP_USER_AGENT no .env se o provedor exigir UA específico. */
function rpkiHttpExtraHeaders(): Record<string, string> {
  const ua = process.env.RPKI_HTTP_USER_AGENT?.trim();
  return {
    'User-Agent': ua || 'BackNet-RPKI/1.0',
  };
}

function formatRpkiHttpErrorPreview(body: Buffer): string {
  if (!body.length) return 'vazio';
  const utf8 = body.toString('utf8').replace(/\s+/g, ' ').trim();
  if (/[\x00-\x08\x0e-\x1f]/.test(utf8.slice(0, 64))) {
    return `(binário ${body.length} bytes) ${body.subarray(0, 24).toString('hex')}…`;
  }
  if (utf8.length <= 420) return utf8;
  return `${utf8.slice(0, 360)}…`;
}

function toHexPreview(buf: Buffer, bytes = 24): string {
  if (!buf.length) return '';
  return buf.subarray(0, Math.min(bytes, buf.length)).toString('hex');
}

function getCertSerialHexFromPem(certPem: string): string {
  try {
    return forge.pki.certificateFromPem(certPem).serialNumber || 'unknown';
  } catch {
    return 'invalid-cert';
  }
}

function logRpkiCmsDebug(message: string, meta: Record<string, unknown>): void {
  if (!isRpkiDebugCmsEnabled) return;
  logger.warn(message, meta);
}

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
  /** Certificado de recurso já emitido pelo parent para esta classe (DER base64). */
  issuedCertBase64: string | null;
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

function looksLikeBase64Certificate(input: string): boolean {
  const compact = input.replace(/\s+/g, '');
  if (compact.length < 200) return false;
  if (compact.includes('<') || compact.includes('>')) return false;
  // Certificados DER base64 normalmente começam com MI...
  if (!compact.startsWith('MI')) return false;
  return /^[A-Za-z0-9+/=]+$/.test(compact);
}

function extractAttr(attrs: string, name: string): string {
  const quoted = attrs.match(new RegExp(`\\b${name}=(?:"([^"]+)"|'([^']+)')`, 'i'));
  if (quoted?.[1] || quoted?.[2]) {
    return quoted?.[1] ?? quoted?.[2] ?? '';
  }
  const bare = attrs.match(new RegExp(`\\b${name}=([^\\s>]+)`, 'i'));
  return bare?.[1]?.replace(/^["']|["']$/g, '') ?? '';
}

function extractRootXmlns(xml: string): string | null {
  const normalized = normalizeIncomingXml(xml);
  const m = normalized.match(/<(?:(?:[\w.-]+):)?[\w.-]+\b([^>]*)>/i);
  if (!m?.[1]) return null;
  const xmlns = extractAttr(m[1], 'xmlns').trim();
  return xmlns || null;
}

function escapeXmlAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
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

function splitResourceSet(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part.toLowerCase() !== 'inherit');
}

function parseUpDownListResponseXml(xml: string): UpDownListResponseData {
  const normalized = normalizeIncomingXml(xml);
  const type = extractAttr(normalized, 'type').toLowerCase();
  if (type && type !== 'list_response') {
    throw new Error(`Resposta up-down inesperada: type=${type}`);
  }

  const asnResources: string[] = [];
  const ipv4Resources: string[] = [];
  const ipv6Resources: string[] = [];
  const classes: UpDownListResponseClass[] = [];

  // Percorre cada <class ...>...</class>
  const classOpenRe = /<class\b([^>]*)>/gi;
  const classCloseRe = /<\/class\s*>/gi;
  let classMatch: RegExpExecArray | null;
  classOpenRe.lastIndex = 0;

  while ((classMatch = classOpenRe.exec(normalized)) !== null) {
    const attrs = String(classMatch[1] ?? '');
    const className = extractAttr(attrs, 'class_name');
    const certUrl = extractAttr(attrs, 'cert_url');
    const resourceSetAs = extractAttr(attrs, 'resource_set_as');
    const resourceSetIpv4 = extractAttr(attrs, 'resource_set_ipv4');
    const resourceSetIpv6 = extractAttr(attrs, 'resource_set_ipv6');

    asnResources.push(...splitResourceSet(resourceSetAs));
    ipv4Resources.push(...splitResourceSet(resourceSetIpv4));
    ipv6Resources.push(...splitResourceSet(resourceSetIpv6));

    // Extrai certificado já emitido (<certificate ...>BASE64</certificate>) dentro desta classe
    classCloseRe.lastIndex = classMatch.index;
    const closeMatch = classCloseRe.exec(normalized);
    const classBody = closeMatch
      ? normalized.slice(classMatch.index + classMatch[0].length, closeMatch.index)
      : '';
    const certBodyMatch = classBody.match(/<certificate\b[^>]*>([\s\S]*?)<\/certificate>/i);
    const issuedCertBase64 = certBodyMatch
      ? certBodyMatch[1].replace(/\s+/g, '').trim() || null
      : null;

    classes.push({
      className: className || 'Default',
      certUrl: certUrl || '',
      resourceSetAs,
      resourceSetIpv4,
      resourceSetIpv6,
      issuedCertBase64,
    });
  }

  return {
    asnResources: Array.from(new Set(asnResources)),
    ipv4Resources: Array.from(new Set(ipv4Resources)),
    ipv6Resources: Array.from(new Set(ipv6Resources)),
    classes,
  };
}

function toBase64DerFromPemCert(pemCert: string): string {
  const cert = forge.pki.certificateFromPem(pemCert);
  const asn1 = forge.pki.certificateToAsn1(cert);
  const der = forge.asn1.toDer(asn1).getBytes();
  // Base64 sem quebras de linha para parsers XML mais rígidos.
  return Buffer.from(der, 'binary').toString('base64');
}

function formatBase64ForKrillStyle(base64: string, indent = '    '): string {
  const compact = base64.replace(/\s+/g, '');
  const chunks = compact.match(/.{1,64}/g) ?? [compact];
  return chunks.map((chunk) => `${indent}${chunk}`).join('\n');
}

function buildChildRequestXml(childHandle: string, childBpkiTaBase64: string): string {
  return `<child_request xmlns="http://www.hactrn.net/uris/rpki/rpki-setup/" version="1" child_handle="${childHandle}">
  <child_bpki_ta>
${formatBase64ForKrillStyle(childBpkiTaBase64)}
  </child_bpki_ta>
</child_request>`;
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

  if (looksLikeBase64Certificate(normalizedXml)) {
    throw new Error(
      'Resposta inválida: foi informado apenas um certificado/base64. Cole o XML completo da resposta da CA-pai (parent_response).'
    );
  }

  const rootMatch = normalizedXml.match(/<(?:(?:[\w.-]+):)?(?:parent_response|parent-response)\b([^>]*)\/?>/i);
  const attrs = rootMatch?.[1] ?? normalizedXml;
  const serviceUri = extractAttr(attrs, 'service_uri');
  const parentHandle = extractAttr(attrs, 'parent_handle');
  const childHandle = extractAttr(attrs, 'child_handle');

  if (!serviceUri || !parentHandle || !childHandle) {
    const serviceUriGlobal = extractAttr(normalizedXml, 'service_uri');
    const parentHandleGlobal = extractAttr(normalizedXml, 'parent_handle');
    const childHandleGlobal = extractAttr(normalizedXml, 'child_handle');

    if (serviceUriGlobal && parentHandleGlobal && childHandleGlobal) {
      const ref = extractPublicationReferralFromParentXml(normalizedXml);
      return {
        serviceUri: serviceUriGlobal,
        parentHandle: parentHandleGlobal,
        childHandle: childHandleGlobal,
        asnResources: [],
        ipv4Resources: [],
        ipv6Resources: [],
        publicationReferrer: ref?.referrer ?? null,
        publicationReferralTokenBase64: ref?.tokenBase64 ?? null,
      };
    }

    if (!rootMatch?.[1]) {
      throw new Error('XML inválido: tag parent_response não encontrada');
    }

    throw new Error('XML inválido: atributos obrigatórios ausentes (service_uri, parent_handle, child_handle)');
  }

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

  if (!serviceUri || !publisherHandle || !siaBase) {
    throw new Error(
      'XML repository_response inválido: faltam service_uri, publisher_handle ou sia_base (RFC 8183)'
    );
  }

  return {
    serviceUri: serviceUri.trim(),
    publisherHandle: publisherHandle.trim(),
    siaBase: siaBase.trim(),
    rrdpNotificationUri: rrdpRaw.trim() || null,
  };
}

/** Appendix A RFC 8183: handle = pattern [\-_A-Za-z0-9/]*, maxLength 255 */
const RFC8183_HANDLE_MAX = 255;
const RFC8183_HANDLE_PATTERN = /^[\-_A-Za-z0-9/]+$/;

function normalizeHandleForRfc8183AppendixA(handle: string): { value: string; wasAdjusted: boolean } {
  const rawTrim = handle.trim();
  if (!rawTrim) {
    throw new RpkiClientError(
      'Handle da CA está vazio. Defina o handle na CA antes de gerar o publisher_request.'
    );
  }
  let candidate = rawTrim.slice(0, RFC8183_HANDLE_MAX);
  if (RFC8183_HANDLE_PATTERN.test(candidate)) {
    return { value: candidate, wasAdjusted: rawTrim !== handle };
  }
  const replaced = candidate
    .replace(/[^\-_A-Za-z0-9/]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  candidate = replaced.slice(0, RFC8183_HANDLE_MAX).replace(/^-+|-+$/g, '');
  if (!candidate || !RFC8183_HANDLE_PATTERN.test(candidate)) {
    throw new RpkiClientError(
      `Handle da CA não é válido para RFC 8183 (use apenas letras, dígitos, _, - e /). Valor: ${handle.slice(0, 100)}`
    );
  }
  return { value: candidate, wasAdjusted: true };
}

function mergePublicationWarning(current: string | null, extra: string): string {
  return current ? `${current} ${extra}` : extra;
}

function buildPublisherRequestXml(
  params: {
    publisherHandle: string;
    publisherBpkiTaBase64: string;
    tag: string;
    referral: { referrer: string; tokenBase64: string } | null;
    setupNamespace?: string | null;
  }
): string {
  const referralBlock =
    params.referral != null
      ? `\n  <referral referrer="${escapeXmlAttr(params.referral.referrer)}">\n${formatBase64ForKrillStyle(
          params.referral.tokenBase64
        )}\n  </referral>`
      : '';

  const omitDecl = true;
  const omitTag = true;
  const tagAttr = omitTag ? '' : ` tag="${escapeXmlAttr(params.tag)}"`;
  const xmlDecl = omitDecl ? '' : `<?xml version="1.0" encoding="UTF-8"?>\n`;
  const setupNs = 'http://www.hactrn.net/uris/rpki/rpki-setup/';
  return `${xmlDecl}<publisher_request xmlns="${escapeXmlAttr(setupNs)}" version="1"${tagAttr} publisher_handle="${escapeXmlAttr(
    params.publisherHandle
  )}">
  <publisher_bpki_ta>
${formatBase64ForKrillStyle(params.publisherBpkiTaBase64)}
  </publisher_bpki_ta>${referralBlock}
</publisher_request>`;
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


async function runOpenSslCmsSign(xml: string, idCertTaPem: string, idCertTaKeyPem: string): Promise<Buffer> {
  try {
    const finalCms = await signKrillIdCertCms(xml, idCertTaPem, idCertTaKeyPem);
    logRpkiCmsDebug('RPKI up-down: CMS assinado gerado', {
      context: 'RpkiProvisioningService',
      action: 'runOpenSslCmsSign',
      cms_profile: 'krill-idcert-ephemeral-ee',
      cms_length: finalCms.length,
      cms_prefix_hex: toHexPreview(finalCms, 32),
      cert_serial_hex: getCertSerialHexFromPem(idCertTaPem),
    });
    return finalCms;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.warn('RPKI up-down: falha ao assinar CMS estilo Krill', {
      context: 'RpkiProvisioningService',
      action: 'runOpenSslCmsSign',
      error: errorMessage,
    });
    throw error;
  }
}

async function runOpenSslCmsExtractContent(cmsDer: Buffer): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpki-updown-verify-'));
  const inPath = path.join(tempDir, 'response.cms.der');
  const outPath = path.join(tempDir, 'response.xml');

  try {
    await fs.writeFile(inPath, cmsDer);
    await execFileAsync('openssl', [
      'cms', '-verify', '-inform', 'DER',
      '-in', inPath,
      '-noverify',
      '-out', outPath,
    ]);
    return await fs.readFile(outPath, 'utf8');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function fetchResourcesViaUpDown(params: {
  ca: RpkiCa;
  parent: RpkiCaParent;
}): Promise<UpDownListResponseData> {
  if (!params.ca.ca_cert_pem || !params.ca.private_key_pem) {
    throw new Error('CA sem material BPKI para sincronização up-down');
  }
  if (!params.parent.child_handle || !params.parent.parent_handle || !params.parent.service_uri) {
    throw new Error('Dados de parent incompletos para sincronização up-down');
  }

  await ensureBpkiEeMaterialForCa(params.ca);

  const queryXml = `<?xml version="1.0" encoding="UTF-8"?>
<message xmlns="http://www.apnic.net/specs/rescerts/up-down/"
         version="1"
         sender="${params.parent.child_handle}"
         recipient="${params.parent.parent_handle}"
         type="list"/>`;
  const idCert = getBpkiIdCertMaterial(params.ca);
  const cmsRequest = await runOpenSslCmsSign(queryXml, idCert.certPem, idCert.keyPem);
  logRpkiCmsDebug('RPKI up-down: enviando list query', {
    context: 'RpkiProvisioningService',
    action: 'fetchResourcesViaUpDown',
    ca_id: params.ca.id,
    parent_id: params.parent.id,
    child_handle: params.parent.child_handle,
    parent_handle: params.parent.parent_handle,
    cms_profile: 'rfc6492-default',
    cms_length: cmsRequest.length,
    cms_prefix_hex: toHexPreview(cmsRequest, 32),
    cert_serial_hex: getCertSerialHexFromPem(params.ca.ca_cert_pem),
  });

  const contentType = 'application/rpki-updown';
  const response = await axios.post<ArrayBuffer>(params.parent.service_uri, cmsRequest, {
    headers: {
      'Content-Type': contentType,
      Accept: 'application/rpki-updown, application/octet-stream, */*',
      'Content-Length': String(cmsRequest.byteLength),
      ...rpkiHttpExtraHeaders(),
    },
    transformRequest: [(data) => data],
    responseType: 'arraybuffer',
    timeout: 25000,
    validateStatus: () => true,
  });

  const responseBody = Buffer.from(response.data ?? []);
  const status = response.status;

  if (status >= 200 && status < 400) {
    const responseContentType = String(response.headers['content-type'] ?? '').toLowerCase();
    const isXmlLike =
      responseContentType.includes('xml') || responseBody.toString('utf8', 0, 32).includes('<?xml');
    const xml = isXmlLike ? responseBody.toString('utf8') : await runOpenSslCmsExtractContent(responseBody);
    const result = parseUpDownListResponseXml(xml);
    const { RpkiSyncLog } = await import('../../../models/rpki/RpkiSyncLog');
    RpkiSyncLog.create({
      empresa_id: params.ca.empresa_id,
      ca_id: params.ca.id,
      type: 'provisioning',
      status: 'success',
      remote_host: params.parent.service_uri,
      message: `Sincronização RFC 6492 (list) concluída. Recursos recebidos: ${result.classes.length} classe(s).`,
    }).catch(() => {});
    return result;
  }

  const preview = formatRpkiHttpErrorPreview(responseBody);
  logRpkiCmsDebug('RPKI up-down: parent rejeitou CMS list query', {
    context: 'RpkiProvisioningService',
    action: 'fetchResourcesViaUpDown',
    ca_id: params.ca.id,
    parent_id: params.parent.id,
    cms_profile: 'rfc6492-default',
    content_type: contentType,
    status,
    response_preview: preview,
    cms_length: cmsRequest.length,
    cms_prefix_hex: toHexPreview(cmsRequest, 32),
    cert_serial_hex: getCertSerialHexFromPem(params.ca.ca_cert_pem),
  });

  const errMsg = `Falha up-down no parent (HTTP ${status}, Content-Type=${contentType}, profile=rfc6492-default, body=${preview})`;
  const { RpkiSyncLog } = await import('../../../models/rpki/RpkiSyncLog');
  RpkiSyncLog.create({
    empresa_id: params.ca.empresa_id,
    ca_id: params.ca.id,
    type: 'provisioning',
    status: 'failed',
    remote_host: params.parent.service_uri,
    message: errMsg,
  }).catch(() => {});
  throw new Error(errMsg);
}

/** IdCert TA persistido (Krill Rfc8183Id / child_bpki_ta). */
export function getBpkiIdCertMaterial(ca: RpkiCa): { certPem: string; keyPem: string } {
  const certPem = ca.ca_cert_pem ?? ca.bpki_ta_cert_pem;
  const keyPem = ca.private_key_pem;
  if (!certPem || !keyPem) {
    throw new RpkiClientError('CA sem IdCert BPKI (TA) para assinar CMS');
  }
  return { certPem, keyPem };
}

/** @deprecated use getBpkiIdCertMaterial */
export function getBpkiCmsSigningMaterial(ca: RpkiCa): { certPem: string; keyPem: string } {
  return getBpkiIdCertMaterial(ca);
}

/** @deprecated use getBpkiIdCertMaterial */
export function getBpkiTaCrlMaterial(ca: RpkiCa): { certPem: string; keyPem: string } {
  return getBpkiIdCertMaterial(ca);
}

function getSetupTaCertPemForXml(ca: RpkiCa): string {
  return getBpkiIdCertMaterial(ca).certPem;
}

async function generateInitialIdCertKeyPair(): Promise<{ privateKeyPem: string; idCertTaPem: string }> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpki-id-init-'));
  try {
    const keyPath = path.join(tempDir, 'key.pem');
    await execFileAsync('openssl', ['genrsa', '-out', keyPath, '2048']);
    const privateKeyPem = await fs.readFile(keyPath, 'utf8');
    const idCertTaPem = await issueIdCertTa(privateKeyPem);
    return { privateKeyPem, idCertTaPem };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

/** Garante IdCert TA estilo Krill (único certificado BPKI; CMS usa EE efêmero por mensagem). */
export async function ensureBpkiEeMaterialForCa(ca: RpkiCa): Promise<void> {
  let taKey = ca.private_key_pem;

  if (!taKey) {
    const init = await generateInitialIdCertKeyPair();
    await ca.update({
      private_key_pem: init.privateKeyPem,
      ca_cert_pem: init.idCertTaPem,
      bpki_ta_cert_pem: init.idCertTaPem,
      bpki_ee_key_pem: null,
    });
    await ca.reload();
    return;
  }

  const currentTa = ca.ca_cert_pem ?? ca.bpki_ta_cert_pem;
  if (!currentTa || !hasKrillStyleIdCertTa(currentTa)) {
    const idCertTaPem = await issueIdCertTa(taKey);
    await ca.update({
      ca_cert_pem: idCertTaPem,
      bpki_ta_cert_pem: idCertTaPem,
      bpki_ee_key_pem: null,
    });
    await ca.reload();
    return;
  }

  if (ca.ca_cert_pem !== currentTa || ca.bpki_ta_cert_pem !== currentTa || ca.bpki_ee_key_pem) {
    await ca.update({
      ca_cert_pem: currentTa,
      bpki_ta_cert_pem: currentTa,
      bpki_ee_key_pem: null,
    });
    await ca.reload();
  }
}

// ─── Helpers para RFC 6492 request/issue ─────────────────────────────────────

function derBase64ToPem(base64: string): string {
  const compact = base64.replace(/\s+/g, '');
  const lines = compact.match(/.{1,64}/g) ?? [compact];
  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----\n`;
}

/**
 * Constrói o DER da extensão SubjectInfoAccess (SIA) para um CA RPKI.
 * OID id-ad-caRepository = 1.3.6.1.5.5.7.48.5
 * OID id-ad-rpkiManifest = 1.3.6.1.5.5.7.48.10
 * Retorna o hex DER para embedding em config OpenSSL.
 */
function buildRpkiSiaDerHex(caRepository: string, manifestUri: string): string {
  // Primitivas DER mínimas sem dependência de biblioteca
  function derLen(n: number): Buffer {
    if (n < 128) return Buffer.from([n]);
    const bytes: number[] = [];
    let v = n;
    while (v > 0) { bytes.unshift(v & 0xff); v >>= 8; }
    return Buffer.from([0x80 | bytes.length, ...bytes]);
  }
  function tlv(tag: number, content: Buffer): Buffer {
    return Buffer.concat([Buffer.from([tag]), derLen(content.length), content]);
  }
  function oid(dotted: string): Buffer {
    const parts = dotted.split('.').map(Number);
    const bytes: number[] = [40 * parts[0] + parts[1]];
    for (let i = 2; i < parts.length; i++) {
      let v = parts[i];
      const chunk: number[] = [v & 0x7f];
      v >>= 7;
      while (v > 0) { chunk.unshift((v & 0x7f) | 0x80); v >>= 7; }
      bytes.push(...chunk);
    }
    return tlv(0x06, Buffer.from(bytes));
  }
  function uri(u: string): Buffer { return tlv(0x86, Buffer.from(u, 'ascii')); }
  function seq(content: Buffer): Buffer { return tlv(0x30, content); }

  const accessDesc = (oidStr: string, u: string) =>
    seq(Buffer.concat([oid(oidStr), uri(u)]));

  const siaValue = seq(Buffer.concat([
    accessDesc('1.3.6.1.5.5.7.48.5', caRepository),
    accessDesc('1.3.6.1.5.5.7.48.10', manifestUri),
  ]));
  return siaValue.toString('hex').toUpperCase();
}

/**
 * Gera um CSR RPKI com as extensões obrigatórias exigidas pelo Krill/bcder (RFC 6492):
 *   - BasicConstraints: CA:TRUE (critical)
 *   - KeyUsage: keyCertSign + cRLSign (critical)
 *   - SubjectInfoAccess: caRepository + rpkiManifest (not critical)
 *
 * Usa OpenSSL para garantir DER canônico (boolean TRUE = 0xff, exigido pelo bcder).
 * node-forge codifica boolean como 0x01 (não-canônico), o que o Krill rejeita.
 */
async function generateRpkiCsrForCa(params: {
  childHandle: string;
  rsyncBaseUri: string;
}): Promise<{ keyPem: string; csrBase64: string; manifestUri: string }> {
  const caRepository = params.rsyncBaseUri.endsWith('/')
    ? params.rsyncBaseUri
    : `${params.rsyncBaseUri}/`;
  const manifestUri = `${caRepository}${params.childHandle}.mft`;

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpki-rkey-'));
  try {
    const keyPath = path.join(tempDir, 'resource_key.pem');
    const csrPemPath = path.join(tempDir, 'resource_csr.pem');
    const csrDerPath = path.join(tempDir, 'resource_csr.der');
    const configPath = path.join(tempDir, 'csr.cnf');

    await execFileAsync('openssl', ['genrsa', '-out', keyPath, '2048']);

    const siaDerHex = buildRpkiSiaDerHex(caRepository, manifestUri);

    // Config OpenSSL: OpenSSL garante DER canônico (boolean TRUE = 0xff)
    const config = [
      '[req]',
      'prompt = no',
      'distinguished_name = dn',
      'req_extensions = rpki_ext',
      '',
      '[dn]',
      '',
      '[rpki_ext]',
      'basicConstraints = critical, CA:TRUE',
      'keyUsage = critical, keyCertSign, cRLSign',
      `1.3.6.1.5.5.7.1.11 = DER:${siaDerHex}`,
    ].join('\n');
    await fs.writeFile(configPath, config, 'utf8');

    // -subj "/" gera subject vazio (recomendado pelo RFC 6487 para CAs RPKI)
    await execFileAsync('openssl', [
      'req', '-new',
      '-key', keyPath,
      '-subj', '/',
      '-config', configPath,
      '-out', csrPemPath,
    ]);
    await execFileAsync('openssl', [
      'req', '-in', csrPemPath,
      '-outform', 'DER',
      '-out', csrDerPath,
    ]);

    const [keyPem, csrDer] = await Promise.all([
      fs.readFile(keyPath, 'utf8'),
      fs.readFile(csrDerPath),
    ]);
    return { keyPem, csrBase64: csrDer.toString('base64'), manifestUri };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function escapeUpDownXmlAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function buildUpDownRequestXml(params: {
  senderHandle: string;
  recipientHandle: string;
  className: string;
  resourceSetAs: string;
  resourceSetIpv4: string;
  resourceSetIpv6: string;
  csrBase64: string;
}): string {
  const e = escapeUpDownXmlAttr;
  const asAttr = params.resourceSetAs ? ` req_resource_set_as="${e(params.resourceSetAs)}"` : '';
  const ipv4Attr = params.resourceSetIpv4 ? ` req_resource_set_ipv4="${e(params.resourceSetIpv4)}"` : '';
  const ipv6Attr = params.resourceSetIpv6 ? ` req_resource_set_ipv6="${e(params.resourceSetIpv6)}"` : '';

  // RFC 6492 §3.4.1: o type do <message> deve ser "issue" (não "request")!
  // O Krill converte o atributo type via PayloadType::from_str e rejeita
  // qualquer valor desconhecido com XmlError::Malformed.
  // O elemento filho continua sendo <request> conforme o RFC.
  return `<?xml version="1.0" encoding="UTF-8"?>
<message xmlns="http://www.apnic.net/specs/rescerts/up-down/"
         version="1"
         sender="${e(params.senderHandle)}"
         recipient="${e(params.recipientHandle)}"
         type="issue">
  <request class_name="${e(params.className)}"${asAttr}${ipv4Attr}${ipv6Attr}>
${params.csrBase64}
  </request>
</message>`;
}

interface UpDownIssueResponseData {
  className: string;
  certUrl: string;
  certBase64: string;
}

function parseUpDownIssueResponseXml(xml: string): UpDownIssueResponseData {
  const normalized = normalizeIncomingXml(xml);
  const type = extractAttr(normalized, 'type').toLowerCase();

  if (type === 'error_response') {
    const descMatch = normalized.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    const desc = descMatch ? descMatch[1].trim() : 'erro desconhecido do parent';
    throw new Error(`RFC 6492 error_response: ${desc}`);
  }

  // RFC 6492 §3.4.2: resposta à emissão tem type="issue_response".
  // O conteúdo é idêntico ao list_response: um elemento <class> com
  // exatamente um elemento <certificate> (o novo certificado emitido).
  if (type !== 'issue_response') {
    throw new Error(`RFC 6492: resposta inesperada ao request (type=${type})`);
  }

  // Extrai o <class> com class_name e cert_url (URL do certificado emissor)
  const classMatch = normalized.match(/<class\b([^>]*)>/i);
  if (!classMatch) {
    throw new Error('RFC 6492 issue_response: elemento <class> não encontrado');
  }
  const classAttrs = String(classMatch[1] ?? '');
  const className = extractAttr(classAttrs, 'class_name') || 'Default';

  // Extrai o <certificate cert_url="...">base64</certificate>
  // Esse é o certificado de recurso emitido pelo parent para esta CA
  const certElMatch = normalized.match(/<certificate\b([^>]*)>([\s\S]*?)<\/certificate>/i);
  if (!certElMatch) {
    throw new Error('RFC 6492 issue_response: elemento <certificate> não encontrado');
  }
  const certAttrs = String(certElMatch[1] ?? '');
  const certUrl = extractAttr(certAttrs, 'cert_url') || '';
  const certBase64 = certElMatch[2].replace(/\s+/g, '').trim();

  if (!certBase64) {
    throw new Error('RFC 6492 issue_response: certificado de recurso ausente');
  }

  return { className, certUrl, certBase64 };
}

export class RpkiProvisioningService {
  static async syncParentResources(params: {
    ca: RpkiCa;
    parent: RpkiCaParent;
    empresaId: number | null;
  }): Promise<UpDownListResponseData> {
    const upDownResources = await fetchResourcesViaUpDown({
      ca: params.ca,
      parent: params.parent,
    });

    await syncResourcesFromParentResponse({
      caId: params.ca.id,
      empresaId: params.empresaId,
      asnResources: upDownResources.asnResources,
      ipv4Resources: upDownResources.ipv4Resources,
      ipv6Resources: upDownResources.ipv6Resources,
    });

    // Se o parent já emitiu um certificado de recurso em alguma classe, armazena.
    for (const cls of upDownResources.classes) {
      if (cls.issuedCertBase64 && cls.certUrl) {
        const certPem = derBase64ToPem(cls.issuedCertBase64);
        await params.ca.update({
          resource_cert_pem: certPem,
          resource_cert_url: cls.certUrl,
          resource_class_name: cls.className,
          status: 'active',
        });
        await params.ca.reload();
        break;
      }
    }

    await params.parent.update({
      provisioning_status: 'active',
      last_sync_at: new Date(),
      last_error: null,
    });

    return upDownResources;
  }

  /**
   * Solicita certificado de recurso ao parent via RFC 6492 request/issue.
   * Gera par de chaves RSA para o resource cert (separado do BPKI).
   * Armazena resource_cert_pem, resource_key_pem, resource_cert_url na CA.
   */
  static async requestResourceCert(params: {
    ca: RpkiCa;
    parent: RpkiCaParent;
  }): Promise<void> {
    const { ca, parent } = params;

    if (!ca.ca_cert_pem || !ca.private_key_pem) {
      throw new Error('CA sem material BPKI para assinar request up-down');
    }
    if (!parent.child_handle || !parent.parent_handle || !parent.service_uri) {
      throw new Error('Dados de parent incompletos para RFC 6492 request');
    }

    await ensureBpkiEeMaterialForCa(ca);

    // 1. Obtém as classes disponíveis via list
    const listData = await fetchResourcesViaUpDown({ ca, parent });
    if (listData.classes.length === 0) {
      throw new Error('Parent não retornou classes de recursos no list_response');
    }

    // Usa a primeira classe (ou a que já foi usada anteriormente)
    const targetClass =
      listData.classes.find((c) => c.className === ca.resource_class_name) ??
      listData.classes[0];

    // Se a classe já tem um certificado emitido, só armazena
    if (targetClass.issuedCertBase64 && targetClass.certUrl) {
      const certPem = derBase64ToPem(targetClass.issuedCertBase64);
      if (!ca.resource_key_pem) {
        // Sem chave não conseguimos usar o cert — precisa re-emitir
        logger.warn('RpkiProvisioningService: parent já emitiu cert mas CA não tem resource_key_pem; re-emitindo', {
          context: 'RpkiProvisioningService',
          action: 'requestResourceCert',
          caId: ca.id,
        });
      } else {
        await ca.update({
          resource_cert_pem: certPem,
          resource_cert_url: targetClass.certUrl,
          resource_class_name: targetClass.className,
        });
        return;
      }
    }

    // 2. Localiza o repositório RPKI desta CA para obter rsync_base_uri (necessário para SIA no CSR)
    const repository = await RpkiRepository.findOne({ where: { ca_id: ca.id } });
    if (!repository?.rsync_base_uri) {
      throw new Error(
        'CA não possui repositório RPKI com rsync_base_uri configurado. ' +
        'Importe o repository_response antes de solicitar o certificado de recurso.'
      );
    }

    // 3. Gera par de chaves RSA + CSR RPKI com BasicConstraints/KeyUsage/SIA
    const { keyPem: resourceKeyPem, csrBase64, manifestUri } = await generateRpkiCsrForCa({
      childHandle: parent.child_handle,
      rsyncBaseUri: repository.rsync_base_uri,
    });

    logger.info('RpkiProvisioningService: CSR RPKI gerado com extensões', {
      context: 'RpkiProvisioningService',
      action: 'requestResourceCert',
      caId: ca.id,
      caRepository: repository.rsync_base_uri,
      manifestUri,
    });

    // 4. Monta a mensagem RFC 6492 type="request"
    const requestXml = buildUpDownRequestXml({
      senderHandle: parent.child_handle,
      recipientHandle: parent.parent_handle,
      className: targetClass.className,
      resourceSetAs: targetClass.resourceSetAs,
      resourceSetIpv4: targetClass.resourceSetIpv4,
      resourceSetIpv6: targetClass.resourceSetIpv6,
      csrBase64,
    });

    // 4. Assina com BPKI e envia
    logger.info('RpkiProvisioningService: RFC 6492 request XML gerado', {
      context: 'RpkiProvisioningService',
      action: 'requestResourceCert',
      caId: ca.id,
      parentId: parent.id,
      className: targetClass.className,
      request_xml_preview: requestXml.slice(0, 800),
    });
    const idCert = getBpkiIdCertMaterial(ca);
    const cmsDer = await runOpenSslCmsSign(requestXml, idCert.certPem, idCert.keyPem);

    const contentType = 'application/rpki-updown';
    const response = await axios.post<ArrayBuffer>(parent.service_uri, cmsDer, {
      headers: {
        'Content-Type': contentType,
        Accept: 'application/rpki-updown, application/octet-stream, */*',
        'Content-Length': String(cmsDer.byteLength),
        ...rpkiHttpExtraHeaders(),
      },
      transformRequest: [(data) => data],
      responseType: 'arraybuffer',
      timeout: 25000,
      validateStatus: () => true,
    });

    const responseBody = Buffer.from(response.data ?? []);
    const status = response.status;

    if (status < 200 || status >= 400) {
      const preview = formatRpkiHttpErrorPreview(responseBody);
      const errMsg = `Parent rejeitou RFC 6492 request (HTTP ${status}): ${preview}`;
      const { RpkiSyncLog } = await import('../../../models/rpki/RpkiSyncLog');
      RpkiSyncLog.create({
        empresa_id: ca.empresa_id,
        ca_id: ca.id,
        type: 'provisioning',
        status: 'failed',
        remote_host: parent.service_uri,
        message: errMsg,
      }).catch(() => {});
      throw new Error(errMsg);
    }

    // 5. Extrai XML da resposta CMS
    const responseContentType = String(response.headers['content-type'] ?? '').toLowerCase();
    const isXmlLike =
      responseContentType.includes('xml') || responseBody.toString('utf8', 0, 32).includes('<?xml');
    const responseXml = isXmlLike
      ? responseBody.toString('utf8')
      : await runOpenSslCmsExtractContent(responseBody);

    // 6. Parseia a resposta (type="issue_response")
    const issued = parseUpDownIssueResponseXml(responseXml);

    const resourceCertPem = derBase64ToPem(issued.certBase64);

    await ca.update({
      resource_cert_pem: resourceCertPem,
      resource_key_pem: resourceKeyPem,
      resource_cert_url: issued.certUrl,
      resource_class_name: issued.className,
      status: 'active',
    });

    logger.info('RpkiProvisioningService: certificado de recurso obtido via RFC 6492 request/issue', {
      context: 'RpkiProvisioningService',
      action: 'requestResourceCert',
      caId: ca.id,
      parentId: parent.id,
      className: issued.className,
      certUrl: issued.certUrl,
    });

    const { RpkiSyncLog } = await import('../../../models/rpki/RpkiSyncLog');
    RpkiSyncLog.create({
      empresa_id: ca.empresa_id,
      ca_id: ca.id,
      type: 'provisioning',
      status: 'success',
      remote_host: parent.service_uri,
      message: `Certificado de recurso emitido via RFC 6492. Classe: ${issued.className}.`,
    }).catch(() => {});
  }

  static async generateChildRequest(ca: RpkiCa): Promise<{ xml: string; ca: RpkiCa }> {
    await ensureBpkiEeMaterialForCa(ca);
    await ca.reload();

    const protocolHandle = toProtocolSafeHandle(ca.handle || ca.nome);
    if (protocolHandle !== ca.handle) {
      await ca.update({ handle: protocolHandle });
    }

    const setupTaCertPem = getSetupTaCertPemForXml(ca);
    const childBpkiTa = toBase64DerFromPemCert(setupTaCertPem);
    const xml = buildChildRequestXml(protocolHandle, childBpkiTa);
    await ca.reload();
    return { xml, ca };
  }

  static async importParentResponse(params: {
    ca: RpkiCa;
    parentName: string;
    responseXml: string;
    empresaId: number | null;
  }): Promise<RpkiCaParent> {
    const parsed = parseParentResponseXml(params.responseXml);
    const parentResponseStored = normalizeIncomingXml(params.responseXml);

    if (parsed.childHandle !== params.ca.handle) {
      await params.ca.update({ handle: parsed.childHandle });
    }

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
    // Comportamento global: não faz sync up-down automático no import.
    // O vínculo da CA-pai é salvo e o sync pode ser executado manualmente.
    await parent.update({
      provisioning_status: 'active',
      last_error: null,
    });
    return parent;
  }

  static async generatePublisherRequest(params: {
    ca: RpkiCa;
    parentId?: number | null;
    tag?: string | null;
  }): Promise<{ xml: string; tag: string; ca: RpkiCa; warning: string | null }> {
    await ensureBpkiEeMaterialForCa(params.ca);
    await params.ca.reload();

    const certPem = params.ca.ca_cert_pem;
    if (!certPem) {
      throw new Error('CA sem certificado BPKI para publisher_request');
    }

    const setupTaCertPem = getSetupTaCertPemForXml(params.ca);
    const publisherBpkiTa = toBase64DerFromPemCert(setupTaCertPem);

    const handleNorm = normalizeHandleForRfc8183AppendixA(params.ca.handle);
    let publisherHandle = handleNorm.value;
    let warning: string | null = null;
    if (handleNorm.wasAdjusted) {
      warning = mergePublicationWarning(
        warning,
        `publisher_handle foi ajustado para "${publisherHandle}" (RFC 8183: só letras, dígitos, _, - e /).`
      );
    }

    let tag = String(params.tag ?? '').trim();
    if (!tag) {
      tag = `bn-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    }

    let referral: { referrer: string; tokenBase64: string } | null = null;
    let setupNamespace: string | null = null;
    const parentId = params.parentId != null && Number.isFinite(Number(params.parentId)) ? Number(params.parentId) : 0;
    if (parentId > 0) {
      const parentRow = await RpkiCaParent.findOne({
        where: { id: parentId, ca_id: params.ca.id },
      });
      if (!parentRow) {
        throw new RpkiClientError('CA-pai não encontrada para esta CA');
      }
      const storedParentXml = parentRow.parent_response_xml?.trim() ?? '';
      setupNamespace = storedParentXml ? extractRootXmlns(storedParentXml) : null;

      let ref = parentRow.publication_referrer?.trim() ?? '';
      let tok = parentRow.publication_referral_token?.replace(/\s+/g, '').trim() ?? '';

      if (!ref || !tok) {
        const storedXml = storedParentXml;
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
        referral = { referrer: ref, tokenBase64: tok };
      } else {
        warning = mergePublicationWarning(
          warning,
          'CA-pai sem <referral>. Gerando publisher_request sem esse bloco (alguns fluxos do Registro.br funcionam assim).'
        );
      }
    }

    const xml = buildPublisherRequestXml({
      publisherHandle,
      publisherBpkiTaBase64: publisherBpkiTa,
      tag,
      referral,
      setupNamespace,
    });

    return { xml, tag, ca: params.ca, warning };
  }

  static async importRepositoryResponse(params: {
    ca: RpkiCa;
    responseXml: string;
    empresaId: number | null;
  }): Promise<RpkiRepository> {
    const parsed = parseRepositoryResponseXml(params.responseXml);

    const [row, created] = await RpkiRepository.findOrCreate({
      where: {
        ca_id: params.ca.id,
        repository_name: parsed.publisherHandle,
      },
      defaults: {
        empresa_id: params.empresaId,
        ca_id: params.ca.id,
        repository_name: parsed.publisherHandle,
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

    return row;
  }
}

