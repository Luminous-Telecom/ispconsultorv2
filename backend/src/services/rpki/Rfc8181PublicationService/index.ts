/**
 * Rfc8181PublicationService
 *
 * Implementa o protocolo de publicação RFC 8181 (RPKI Publication Protocol).
 * Envia PDUs de publicação (publish / withdraw / list) ao servidor de publicação
 * via CMS assinado (Content-Type: application/rpki-publication).
 *
 * Referências: RFC 8181, RFC 8183.
 */
import axios from 'axios';
import { extractCmsContentAsUtf8, signKrillIdCertCms } from '../RpkiOpenSslLib';

const PUBLICATION_NS = 'http://www.hactrn.net/uris/rpki/rpki-setup/';
const PUBLICATION_CONTENT_TYPE = 'application/rpki-publication';
const PUBLICATION_MSG_VERSION = '4';

export interface PublishObject {
  uri: string;
  derBase64: string;
  /** Hash SHA-256 hex do objeto anterior (para replace); omitir no primeiro publish */
  previousHashHex?: string;
}

export interface WithdrawObject {
  uri: string;
  hashHex: string;
}

export interface ListedObject {
  uri: string;
  hashHex: string;
}

// ─── XML helpers ─────────────────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildPublishXml(objects: PublishObject[], withdrawals: WithdrawObject[]): string {
  const parts: string[] = [];

  for (const obj of objects) {
    const hashAttr = obj.previousHashHex
      ? ` hash="${escapeXml(obj.previousHashHex)}"`
      : '';
    parts.push(
      `  <publish uri="${escapeXml(obj.uri)}"${hashAttr}>${obj.derBase64}</publish>`
    );
  }

  for (const w of withdrawals) {
    parts.push(
      `  <withdraw uri="${escapeXml(w.uri)}" hash="${escapeXml(w.hashHex)}"/>`
    );
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<msg type="query" version="${PUBLICATION_MSG_VERSION}" ` +
    `xmlns="${PUBLICATION_NS}">\n` +
    parts.join('\n') +
    '\n</msg>'
  );
}

function buildListXml(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<msg type="query" version="${PUBLICATION_MSG_VERSION}" ` +
    `xmlns="${PUBLICATION_NS}">\n` +
    `  <list/>\n</msg>`
  );
}

// ─── Parseamento de respostas RFC 8181 ───────────────────────────────────────

function parsePublicationReply(xml: string): { success: boolean; errors: string[] } {
  const normalized = xml.replace(/\s+/g, ' ').trim();
  const errors: string[] = [];

  const errorMatches = Array.from(
    normalized.matchAll(/<report_error\b([^>]*)>/gi)
  );
  for (const m of errorMatches) {
    const attrs = String(m[1] ?? '');
    const code = attrs.match(/error_code=["']([^"']+)["']/i)?.[1] ?? 'unknown';
    const uri = attrs.match(/\buri=["']([^"']+)["']/i)?.[1] ?? '';
    errors.push(`error_code=${code}${uri ? ` uri=${uri}` : ''}`);
  }

  return { success: errors.length === 0, errors };
}

function parseListReply(xml: string): ListedObject[] {
  const normalized = xml.replace(/\s+/g, ' ').trim();
  const results: ListedObject[] = [];
  const listMatches = Array.from(normalized.matchAll(/<list\b([^>]*)\/?>/gi));
  for (const m of listMatches) {
    const attrs = String(m[1] ?? '');
    const uri = attrs.match(/\buri=["']([^"']+)["']/i)?.[1] ?? '';
    const hash = attrs.match(/\bhash=["']([^"']+)["']/i)?.[1] ?? '';
    if (uri && hash) results.push({ uri, hashHex: hash });
  }
  return results;
}

// ─── Envio HTTP ao servidor de publicação ────────────────────────────────────

async function sendToPublicationServer(
  serviceUri: string,
  cmsDer: Buffer
): Promise<Buffer> {
  const response = await axios.post<ArrayBuffer>(serviceUri, cmsDer, {
    headers: {
      'Content-Type': PUBLICATION_CONTENT_TYPE,
      Accept: `${PUBLICATION_CONTENT_TYPE}, application/octet-stream, */*`,
      'Content-Length': String(cmsDer.byteLength),
      'User-Agent': process.env.RPKI_HTTP_USER_AGENT?.trim() || 'BackNet-RPKI/1.0',
    },
    transformRequest: [(data) => data],
    responseType: 'arraybuffer',
    timeout: 30000,
    validateStatus: () => true,
  });

  const body = Buffer.from(response.data ?? []);
  if (response.status < 200 || response.status >= 400) {
    const preview = body.toString('utf8', 0, 300).replace(/\s+/g, ' ');
    throw new Error(
      `Servidor de publicação retornou HTTP ${response.status}: ${preview}`
    );
  }
  return body;
}

// ─── API pública ─────────────────────────────────────────────────────────────

export class Rfc8181PublicationService {
  /**
   * Publica objetos e/ou retira objetos do servidor de publicação RFC 8181.
   * Assina CMS com IdCert TA (EE efêmero por mensagem, como Krill SignedMessage).
   */
  static async sendObjects(params: {
    serviceUri: string;
    bpkiCertPem: string;
    bpkiKeyPem: string;
    publish?: PublishObject[];
    withdraw?: WithdrawObject[];
  }): Promise<void> {
    const publishList = params.publish ?? [];
    const withdrawList = params.withdraw ?? [];

    if (publishList.length === 0 && withdrawList.length === 0) return;

    const xml = buildPublishXml(publishList, withdrawList);
    const cmsDer = await signKrillIdCertCms(xml, params.bpkiCertPem, params.bpkiKeyPem);
    const responseBody = await sendToPublicationServer(params.serviceUri, cmsDer);

    let responseXml: string;
    const contentLooks = responseBody.toString('utf8', 0, 32);
    if (contentLooks.includes('<?xml') || contentLooks.includes('<msg')) {
      responseXml = responseBody.toString('utf8');
    } else {
      responseXml = await extractCmsContentAsUtf8(responseBody);
    }

    const result = parsePublicationReply(responseXml);
    if (!result.success) {
      throw new Error(
        `Servidor de publicação retornou erros RFC 8181: ${result.errors.join('; ')}`
      );
    }

  }

  /**
   * Lista os objetos atualmente publicados no servidor (PDU list).
   */
  static async listPublished(params: {
    serviceUri: string;
    bpkiCertPem: string;
    bpkiKeyPem: string;
  }): Promise<ListedObject[]> {
    const xml = buildListXml();
    const cmsDer = await signKrillIdCertCms(xml, params.bpkiCertPem, params.bpkiKeyPem);
    const responseBody = await sendToPublicationServer(params.serviceUri, cmsDer);

    let responseXml: string;
    const contentLooks = responseBody.toString('utf8', 0, 32);
    if (contentLooks.includes('<?xml') || contentLooks.includes('<msg')) {
      responseXml = responseBody.toString('utf8');
    } else {
      responseXml = await extractCmsContentAsUtf8(responseBody);
    }

    const replyCheck = parsePublicationReply(responseXml);
    if (!replyCheck.success) {
      throw new Error(
        `Servidor de publicação (list) retornou erros RFC 8181: ${replyCheck.errors.join('; ')}`
      );
    }

    return parseListReply(responseXml);
  }
}
