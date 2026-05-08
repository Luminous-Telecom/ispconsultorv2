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
const execFileAsync = promisify(execFile);

const RFC8183_SETUP_NS = 'http://www.hactrn.net/uris/rpki/rpki-setup/';
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

interface UpDownListResponseData {
  asnResources: string[];
  ipv4Resources: string[];
  ipv6Resources: string[];
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

  const classMatches = Array.from(normalized.matchAll(/<class\b([^>]*)>/gi));
  for (const match of classMatches) {
    const attrs = String(match[1] ?? '');
    asnResources.push(...splitResourceSet(extractAttr(attrs, 'resource_set_as')));
    ipv4Resources.push(...splitResourceSet(extractAttr(attrs, 'resource_set_ipv4')));
    ipv6Resources.push(...splitResourceSet(extractAttr(attrs, 'resource_set_ipv6')));
  }

  return {
    asnResources: Array.from(new Set(asnResources)),
    ipv4Resources: Array.from(new Set(ipv4Resources)),
    ipv6Resources: Array.from(new Set(ipv6Resources)),
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

interface Asn1ParseNode {
  offset: number;
  depth: number;
  hl: number;
  l: number;
  kind: 'prim' | 'cons';
  rest: string;
}

function parseOpenSslAsn1ParseOutput(output: string): Asn1ParseNode[] {
  const nodes: Asn1ParseNode[] = [];
  const lineRe = /^\s*(\d+):d=(\d+)\s+hl=(\d+)\s+l=\s*(\d+)\s+(prim|cons):\s*(.+)$/;
  for (const line of output.split('\n')) {
    const m = line.match(lineRe);
    if (!m) continue;
    nodes.push({
      offset: Number(m[1]),
      depth: Number(m[2]),
      hl: Number(m[3]),
      l: Number(m[4]),
      kind: m[5] as 'prim' | 'cons',
      rest: m[6].trim(),
    });
  }
  return nodes;
}

function readDerLengthFields(buf: Buffer, offset: number): { lengthFieldOffset: number; lengthFieldSize: number; contentLength: number } {
  const lenByte = buf[offset];
  if (lenByte === undefined) {
    throw new Error('CMS DER truncado ao ler comprimento');
  }
  if (lenByte < 0x80) {
    return { lengthFieldOffset: offset, lengthFieldSize: 1, contentLength: lenByte };
  }
  const numBytes = lenByte & 0x7f;
  let contentLength = 0;
  for (let i = 0; i < numBytes; i += 1) {
    const b = buf[offset + 1 + i];
    if (b === undefined) {
      throw new Error('CMS DER truncado no comprimento longo');
    }
    contentLength = (contentLength << 8) | b;
  }
  return { lengthFieldOffset: offset, lengthFieldSize: 1 + numBytes, contentLength };
}

function writeDerLengthPreservingWidth(
  buf: Buffer,
  lengthFieldOffset: number,
  lengthFieldSize: number,
  newContentLength: number
): void {
  if (lengthFieldSize === 1) {
    if (newContentLength >= 0x80) {
      throw new Error('CMS: expansão DER de comprimento não suportada');
    }
    buf[lengthFieldOffset] = newContentLength;
    return;
  }
  if (lengthFieldSize === 3 && buf[lengthFieldOffset] === 0x82) {
    if (newContentLength > 0xffff) {
      throw new Error('CMS: conteúdo excede 65535 bytes');
    }
    buf[lengthFieldOffset + 1] = (newContentLength >> 8) & 0xff;
    buf[lengthFieldOffset + 2] = newContentLength & 0xff;
    return;
  }
  throw new Error('CMS: formato DER de comprimento inesperado');
}

function encodeDerContentLength(length: number): Buffer {
  if (length < 0x80) {
    return Buffer.from([length]);
  }
  if (length <= 0xff) {
    return Buffer.from([0x81, length]);
  }
  if (length <= 0xffff) {
    return Buffer.from([0x82, (length >> 8) & 0xff, length & 0xff]);
  }
  throw new Error('CMS: comprimento DER fora do intervalo suportado');
}

/** RFC6492: campo `crls` [1] IMPLICIT = corpo SET OF; um CRL → `A1` + len + CRL DER. */
function encodeCmsSignedDataCrlsField(crlDer: Buffer): Buffer {
  if (!crlDer.length || crlDer[0] !== 0x30) {
    throw new Error('CMS: CRL DER inválida (esperado CertificateList SEQUENCE)');
  }
  return Buffer.concat([Buffer.from([0xa1]), encodeDerContentLength(crlDer.length), crlDer]);
}

async function generateBpkiCrlDer(certPem: string, keyPem: string): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpki-bpki-crl-'));
  try {
    const demoCaDir = path.join(tempDir, 'demoCA');
    await fs.mkdir(demoCaDir, { recursive: true });
    await fs.writeFile(path.join(demoCaDir, 'index.txt'), '', 'utf8');
    await fs.writeFile(path.join(demoCaDir, 'serial'), '1000\n', 'utf8');
    await fs.writeFile(path.join(demoCaDir, 'crlnumber'), '1000\n', 'utf8');
    await fs.writeFile(path.join(tempDir, 'cert.pem'), certPem, 'utf8');
    await fs.writeFile(path.join(tempDir, 'key.pem'), keyPem, 'utf8');
    await fs.writeFile(
      path.join(tempDir, 'openssl.cnf'),
      `[ca]
default_ca = CA_default

[CA_default]
dir = ./demoCA
database = $dir/index.txt
serial = $dir/serial
crlnumber = $dir/crlnumber
certificate = ./cert.pem
private_key = ./key.pem
default_md = sha256
default_crl_days = 30
`,
      'utf8'
    );

    await execFileAsync(
      'openssl',
      ['ca', '-config', 'openssl.cnf', '-gencrl', '-out', 'crl.pem', '-batch'],
      { cwd: tempDir }
    );
    await execFileAsync(
      'openssl',
      ['crl', '-in', 'crl.pem', '-outform', 'DER', '-out', 'crl.der'],
      { cwd: tempDir }
    );
    return await fs.readFile(path.join(tempDir, 'crl.der'));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

/** OpenSSL não inclui `crls` no SignedData; injeta antes de signerInfos (RFC6492). */
async function injectRpkiCrlFieldIntoSignedDataCms(cmsDer: Buffer, crlDer: Buffer): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpki-updown-crlinj-'));
  const derPath = path.join(tempDir, 'cms.der');
  try {
    await fs.writeFile(derPath, cmsDer);
    const { stdout } = await execFileAsync('openssl', ['asn1parse', '-inform', 'DER', '-in', derPath]);
    const nodes = parseOpenSslAsn1ParseOutput(stdout);

    const rootSeq = nodes.find((n) => n.depth === 0 && n.kind === 'cons' && n.rest.startsWith('SEQUENCE'));
    if (!rootSeq || rootSeq.offset !== 0) {
      throw new Error('CMS: SEQUENCE raiz não encontrada');
    }

    const depth1Sorted = nodes.filter((n) => n.depth === 1).sort((a, b) => a.offset - b.offset);
    if (depth1Sorted.length < 2) {
      throw new Error('CMS: ContentInfo inválido');
    }
    const explicitWrapper = depth1Sorted[1];
    if (explicitWrapper.kind !== 'cons') {
      throw new Error('CMS: ContentInfo inválido (SignedData)');
    }

    const explicitInnerStart = explicitWrapper.offset + explicitWrapper.hl;
    const explicitInnerEnd = explicitInnerStart + explicitWrapper.l;
    const signedDataCandidates = nodes
      .filter(
        (n) =>
          n.depth === 2 &&
          n.kind === 'cons' &&
          n.rest.trim().startsWith('SEQUENCE') &&
          n.offset >= explicitInnerStart &&
          n.offset < explicitInnerEnd
      )
      .sort((a, b) => a.offset - b.offset);
    const signedDataSeq = signedDataCandidates[0];
    if (!signedDataSeq) {
      throw new Error('CMS: SEQUENCE SignedData não encontrado dentro do ContentInfo');
    }

    const signedBodyStart = signedDataSeq.offset + signedDataSeq.hl;
    const signedBodyEnd = signedBodyStart + signedDataSeq.l;

    const hasCrls = nodes.some(
      (n) =>
        n.depth === 3 &&
        n.kind === 'cons' &&
        /\[\s*1\s*\]/.test(n.rest) &&
        n.offset >= signedBodyStart &&
        n.offset < signedBodyEnd
    );
    if (hasCrls) {
      return cmsDer;
    }

    const setNodesInSignedData = nodes.filter(
      (n) =>
        n.depth === 3 &&
        n.kind === 'cons' &&
        n.rest.trim().startsWith('SET') &&
        n.offset >= signedBodyStart &&
        n.offset < signedBodyEnd
    );
    if (setNodesInSignedData.length < 1) {
      throw new Error('CMS: não foi possível localizar signerInfos (SET) no SignedData para injetar CRL');
    }
    const signerInfosNode = setNodesInSignedData.reduce((a, b) => (a.offset > b.offset ? a : b));

    const crlsFieldDer = encodeCmsSignedDataCrlsField(crlDer);
    const insertAt = signerInfosNode.offset;

    const patched = Buffer.concat([cmsDer.subarray(0, insertAt), crlsFieldDer, cmsDer.subarray(insertAt)]);

    const signedDataLenInfo = readDerLengthFields(patched, signedDataSeq.offset + 1);
    writeDerLengthPreservingWidth(
      patched,
      signedDataLenInfo.lengthFieldOffset,
      signedDataLenInfo.lengthFieldSize,
      signedDataSeq.l + crlsFieldDer.length
    );

    const explicitLenInfo = readDerLengthFields(patched, explicitWrapper.offset + 1);
    writeDerLengthPreservingWidth(
      patched,
      explicitLenInfo.lengthFieldOffset,
      explicitLenInfo.lengthFieldSize,
      explicitWrapper.l + crlsFieldDer.length
    );

    const rootLenInfo = readDerLengthFields(patched, rootSeq.offset + 1);
    writeDerLengthPreservingWidth(
      patched,
      rootLenInfo.lengthFieldOffset,
      rootLenInfo.lengthFieldSize,
      rootSeq.l + crlsFieldDer.length
    );

    return patched;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function runOpenSslCmsSign(xml: string, certPem: string, keyPem: string): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpki-updown-sign-'));
  const xmlPath = path.join(tempDir, 'message.xml');
  const certPath = path.join(tempDir, 'cert.pem');
  const keyPath = path.join(tempDir, 'key.pem');
  const outPath = path.join(tempDir, 'message.cms.der');

  try {
    await fs.writeFile(xmlPath, xml, 'utf8');
    await fs.writeFile(certPath, certPem, 'utf8');
    await fs.writeFile(keyPath, keyPem, 'utf8');

    const args = [
      'cms',
      '-sign',
      '-in',
      xmlPath,
      '-signer',
      certPath,
      '-inkey',
      keyPath,
      '-binary',
      '-nodetach',
      '-nosmimecap',
      '-keyid',
      '-md',
      'sha256',
      '-econtent_type',
      '1.2.840.113549.1.9.16.1.28',
      '-outform',
      'DER',
      '-out',
      outPath,
    ];
    await execFileAsync('openssl', args);

    const raw = await fs.readFile(outPath);
    let finalCms = Buffer.from(raw);
    try {
      // Alguns pais (ex.: NIC.br) exigem o campo SignedData.crls no CMS RFC6492.
      const crlDer = await generateBpkiCrlDer(certPem, keyPem);
      const cmsWithCrl = await injectRpkiCrlFieldIntoSignedDataCms(raw, crlDer);
      finalCms = Buffer.from(cmsWithCrl);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.warn('RPKI up-down: não foi possível injetar CRL no CMS, usando assinatura padrão', {
        context: 'RpkiProvisioningService',
        action: 'runOpenSslCmsSign',
        error: errorMessage,
      });
    }
    logRpkiCmsDebug('RPKI up-down: CMS assinado gerado', {
      context: 'RpkiProvisioningService',
      action: 'runOpenSslCmsSign',
      cms_profile: 'rfc6492-default',
      cms_length: finalCms.length,
      cms_prefix_hex: toHexPreview(finalCms, 32),
      cert_serial_hex: getCertSerialHexFromPem(certPem),
    });
    return finalCms;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
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
  const cmsRequest = await runOpenSslCmsSign(queryXml, params.ca.ca_cert_pem, params.ca.private_key_pem);
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
    return parseUpDownListResponseXml(xml);
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

  throw new Error(`Falha up-down no parent (HTTP ${status}, Content-Type=${contentType}, profile=rfc6492-default, body=${preview})`);
}

function generateSafePositiveSerialHex(): string {
  const bytes = forge.random.getBytesSync(16).split('').map((ch) => ch.charCodeAt(0));
  if (bytes.length === 0) return '01';
  // DER INTEGER precisa ser positivo; limpa bit de sinal.
  bytes[0] &= 0x7f;
  // Evita serial zero.
  const hasAnyNonZeroByte = bytes.some((b) => b !== 0);
  if (!hasAnyNonZeroByte) {
    bytes[bytes.length - 1] = 1;
  }
  const hex = Buffer.from(bytes).toString('hex').replace(/^0+/, '');
  return hex.length > 0 ? hex : '01';
}

function sanitizeCommonNameForOpenSsl(input: string): string {
  const value = String(input || '')
    .replace(/[^\w .:@\-_/]/g, '')
    .trim();
  return value || 'BackNet-RPKI';
}

async function issueSelfSignedEeCertWithOpenSsl(privateKeyPem: string, commonName: string): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpki-bpki-ee-openssl-'));
  try {
    const keyPath = path.join(tempDir, 'key.pem');
    const certPath = path.join(tempDir, 'cert.pem');
    const csrPath = path.join(tempDir, 'req.csr');
    const extPath = path.join(tempDir, 'ext.cnf');
    await fs.writeFile(keyPath, privateKeyPem, 'utf8');
    await fs.writeFile(
      extPath,
      `basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid,issuer
`,
      'utf8'
    );

    const cn = sanitizeCommonNameForOpenSsl(commonName);
    await execFileAsync('openssl', ['req', '-new', '-key', keyPath, '-subj', `/CN=${cn}`, '-out', csrPath]);
    await execFileAsync('openssl', [
      'x509',
      '-req',
      '-in',
      csrPath,
      '-signkey',
      keyPath,
      '-days',
      '1825',
      '-sha256',
      '-extfile',
      extPath,
      '-out',
      certPath,
    ]);

    return await fs.readFile(certPath, 'utf8');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function generateBpkiMaterialWithOpenSsl(commonName: string): Promise<{ certPem: string; privateKeyPem: string }> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpki-bpki-material-openssl-'));
  try {
    const keyPath = path.join(tempDir, 'key.pem');
    await execFileAsync('openssl', ['genrsa', '-out', keyPath, '2048']);
    const privateKeyPem = await fs.readFile(keyPath, 'utf8');
    const certPem = await issueSelfSignedEeCertWithOpenSsl(privateKeyPem, commonName);
    return { certPem, privateKeyPem };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

/** BPKI TA para setup RFC8183 (perfil semelhante ao Krill: CA=true, keyCertSign/cRLSign). */
function applyBpkiTaX509Extensions(cert: forge.pki.Certificate): void {
  cert.setExtensions([
    { name: 'basicConstraints', cA: true, critical: true },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true },
    { name: 'subjectKeyIdentifier' },
    { name: 'authorityKeyIdentifier', keyIdentifier: true },
  ]);
}

/** Reemite cert autoassinado TA (CA=true) usando a mesma chave pública/privada. */
function reissueSelfSignedTaFromExistingPair(certPem: string, privateKeyPem: string): { certPem: string } {
  const oldCert = forge.pki.certificateFromPem(certPem);
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const cert = forge.pki.createCertificate();
  cert.publicKey = oldCert.publicKey;
  cert.serialNumber = generateSafePositiveSerialHex();
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 15);
  cert.setSubject(oldCert.subject.attributes);
  cert.setIssuer(oldCert.subject.attributes);
  applyBpkiTaX509Extensions(cert);
  cert.sign(privateKey, forge.md.sha256.create());
  return { certPem: forge.pki.certificateToPem(cert) };
}

function hasCompatibleBpkiCert(pemCert: string): boolean {
  try {
    const cert = forge.pki.certificateFromPem(pemCert);
    const basicConstraints = cert.getExtension('basicConstraints') as { cA?: boolean } | undefined;
    const keyUsage = cert.getExtension('keyUsage') as {
      digitalSignature?: boolean;
      keyCertSign?: boolean;
    } | undefined;
    const isCaStyle = Boolean(basicConstraints?.cA) || Boolean(keyUsage?.keyCertSign);
    if (isCaStyle) {
      return false;
    }
    const isEe = basicConstraints?.cA !== true;
    const canSignCms = Boolean(keyUsage?.digitalSignature);
    return isEe && canSignCms;
  } catch {
    return false;
  }
}

function hasStrictSafeSerialForParentDecoder(pemCert: string): boolean {
  try {
    const cert = forge.pki.certificateFromPem(pemCert);
    const serialHex = String(cert.serialNumber || '').replace(/^0+/, '').toLowerCase();
    if (!serialHex) return false;
    const firstByteHex = serialHex.length >= 2 ? serialHex.slice(0, 2) : `0${serialHex}`;
    const firstByte = Number.parseInt(firstByteHex, 16);
    if (!Number.isFinite(firstByte)) return false;
    // Alguns decoders antigos rejeitam serial com bit de sinal alto.
    return firstByte < 0x80;
  } catch {
    return false;
  }
}

function hasCompatibleBpkiTaCert(pemCert: string): boolean {
  try {
    const cert = forge.pki.certificateFromPem(pemCert);
    const basicConstraints = cert.getExtension('basicConstraints') as { cA?: boolean } | undefined;
    const keyUsage = cert.getExtension('keyUsage') as {
      keyCertSign?: boolean;
      cRLSign?: boolean;
    } | undefined;
    return Boolean(basicConstraints?.cA) && Boolean(keyUsage?.keyCertSign || keyUsage?.cRLSign);
  } catch {
    return false;
  }
}

/**
 * Certificado BPKI TA usado em child_request/publisher_request.
 * Mantém a mesma chave da CA para preservar continuidade operacional.
 */
function getSetupTaCertPemForXml(ca: RpkiCa): string {
  if (!ca.private_key_pem) {
    throw new RpkiClientError('CA sem chave privada para gerar BPKI TA de setup');
  }
  if (ca.ca_cert_pem && hasCompatibleBpkiTaCert(ca.ca_cert_pem)) {
    return ca.ca_cert_pem;
  }
  if (!ca.ca_cert_pem) {
    throw new RpkiClientError('CA sem certificado base para derivar BPKI TA');
  }
  return reissueSelfSignedTaFromExistingPair(ca.ca_cert_pem, ca.private_key_pem).certPem;
}

async function ensureBpkiEeMaterialForCa(ca: RpkiCa): Promise<void> {
  if (
    hasCompatibleBpkiCert(ca.ca_cert_pem ?? '') &&
    hasStrictSafeSerialForParentDecoder(ca.ca_cert_pem ?? '') &&
    ca.ca_cert_pem &&
    ca.private_key_pem
  ) {
    return;
  }
  if (ca.ca_cert_pem && ca.private_key_pem) {
    const certPem = await issueSelfSignedEeCertWithOpenSsl(ca.private_key_pem, ca.nome);
    await ca.update({ ca_cert_pem: certPem });
    await ca.reload();
    return;
  }
  const generated = await generateBpkiMaterialWithOpenSsl(ca.nome);
  await ca.update({
    ca_cert_pem: generated.certPem,
    private_key_pem: generated.privateKeyPem,
  });
  await ca.reload();
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

    await params.parent.update({
      provisioning_status: 'active',
      last_sync_at: new Date(),
      last_error: null,
    });

    return upDownResources;
  }

  static async generateChildRequest(ca: RpkiCa): Promise<{ xml: string; ca: RpkiCa }> {
    let certPem = ca.ca_cert_pem;
    let privateKeyPem = ca.private_key_pem;

    if (!certPem || !privateKeyPem || !hasCompatibleBpkiCert(certPem)) {
      if (certPem && privateKeyPem) {
        certPem = await issueSelfSignedEeCertWithOpenSsl(privateKeyPem, ca.nome);
        await ca.update({ ca_cert_pem: certPem });
      } else {
        const generated = await generateBpkiMaterialWithOpenSsl(ca.nome);
        certPem = generated.certPem;
        privateKeyPem = generated.privateKeyPem;
        await ca.update({
          ca_cert_pem: certPem,
          private_key_pem: privateKeyPem,
        });
      }
    }

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

