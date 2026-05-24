/**
 * RpkiObjectBuilderService
 *
 * Constrói objetos RPKI (ROA, Manifest, CRL) e certificados EE (End-Entity)
 * seguindo os padrões RFC 6482 (ROA), RFC 9286 (Manifest), RFC 5280 (CRL/cert)
 * e RFC 6487 (perfil RPKI para certificados/CRL).
 *
 * O pipeline por objeto é:
 *   1. Construir conteúdo DER do objeto (RouteOriginAttestation / Manifest)
 *   2. Emitir certificado EE assinado pelo resource CA (OpenSSL lib via Node)
 *   3. Assinar o conteúdo com CMS (pkijs / OpenSSL lib)
 *   4. Retornar DER final + SHA-256 para publicação
 */
import crypto from 'crypto';
import {
  assertRoaEntriesMatchResourceCert,
  buildAsInheritDer,
  buildIpInheritDer,
  parseResourceCertProfile,
} from '../RpkiCertProfile';
import {
  buildCrlDer,
  extractEeRevocationFromCmsDer,
  issueRpkiEeCert,
  signCmsAttached,
  type CrlRevocationEntry,
} from '../RpkiOpenSslLib';

export { buildCrlDer, type CrlRevocationEntry, extractEeRevocationFromCmsDer };

// ─── OIDs usados em objetos RPKI ─────────────────────────────────────────────
const OID_ROA_CONTENT_TYPE  = '1.2.840.113549.1.9.16.1.24';
const OID_MFT_CONTENT_TYPE  = '1.2.840.113549.1.9.16.1.26';
const OID_ASPA_CONTENT_TYPE = '1.2.840.113549.1.9.16.1.49';
const OID_SHA256 = '2.16.840.1.101.3.4.2.1';
// id-ad-signedObject / id-ad-caIssuers
const OID_AD_SIGNED_OBJECT = '1.3.6.1.5.5.7.48.11';
const OID_AD_CA_ISSUERS = '1.3.6.1.5.5.7.48.2';
// id-pe-subjectInfoAccessSyntax / authorityInfoAccess / cRLDistributionPoints
const OID_SIA = '1.3.6.1.5.5.7.1.11';
const OID_AIA = '1.3.6.1.5.5.7.1.1';
const OID_CRLDP = '2.5.29.31';

// ─── Utilitários DER (Buffer) ─────────────────────────────────────────────────

function encodeLength(n: number): Buffer {
  if (n < 0x80) return Buffer.from([n]);
  if (n < 0x100) return Buffer.from([0x81, n]);
  if (n < 0x10000) return Buffer.from([0x82, n >> 8, n & 0xff]);
  return Buffer.from([0x83, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]);
}

function tlv(tag: number, value: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), encodeLength(value.length), value]);
}

const SEQ = (v: Buffer) => tlv(0x30, v);
const OCTET = (v: Buffer) => tlv(0x04, v);
const IA5 = (s: string) => tlv(0x16, Buffer.from(s, 'ascii'));
const NULL_DER = () => Buffer.from([0x05, 0x00]);
const CTX0_CONS = (v: Buffer) => tlv(0xa0, v);  // [0] CONSTRUCTED
const CTX6_IMP = (v: Buffer) => tlv(0x86, v);   // [6] IMPLICIT (GeneralName URI)

function derOid(oid: string): Buffer {
  const parts = oid.split('.').map(Number);
  const result: number[] = [parts[0] * 40 + parts[1]];
  for (let i = 2; i < parts.length; i++) {
    let v = parts[i];
    const bytes: number[] = [v & 0x7f];
    v >>= 7;
    while (v > 0) {
      bytes.unshift((v & 0x7f) | 0x80);
      v >>= 7;
    }
    result.push(...bytes);
  }
  return tlv(0x06, Buffer.from(result));
}

function derIntegerUInt(n: number): Buffer {
  if (n === 0) return tlv(0x02, Buffer.from([0x00]));
  let hex = n.toString(16);
  if (hex.length % 2 !== 0) hex = '0' + hex;
  let bytes = Buffer.from(hex, 'hex');
  if (bytes[0] >= 0x80) bytes = Buffer.concat([Buffer.from([0x00]), bytes]);
  return tlv(0x02, bytes);
}

function derGeneralizedTime(d: Date): Buffer {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const s =
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  return tlv(0x18, Buffer.from(s, 'ascii'));
}

/** BIT STRING: 1 byte unused-bits + data */
function derBitString(data: Buffer, unusedBits = 0): Buffer {
  return tlv(0x03, Buffer.concat([Buffer.from([unusedBits]), data]));
}

// ─── Extensões DER para certificados EE (RFC 6487) ───────────────────────────

function buildSiaDer(objectUri: string): Buffer {
  const accessDesc = SEQ(
    Buffer.concat([derOid(OID_AD_SIGNED_OBJECT), CTX6_IMP(Buffer.from(objectUri, 'ascii'))])
  );
  return SEQ(accessDesc);
}

function buildAiaDer(caIssuerUri: string): Buffer {
  const accessDesc = SEQ(
    Buffer.concat([derOid(OID_AD_CA_ISSUERS), CTX6_IMP(Buffer.from(caIssuerUri, 'ascii'))])
  );
  return SEQ(accessDesc);
}

function buildCrldpDer(crlUri: string): Buffer {
  const uri = CTX6_IMP(Buffer.from(crlUri, 'ascii'));
  const fullName = tlv(0xa0, uri);          // [0] DistributionPointName
  const dpName = tlv(0xa0, fullName);        // [0] distributionPoint
  const dp = SEQ(dpName);
  return SEQ(dp);
}

// ─── ROA content (RFC 6482) ──────────────────────────────────────────────────

function expandIPv6(ip: string): Buffer {
  const sections = ip.split('::');
  const left = sections[0] ? sections[0].split(':').filter(Boolean) : [];
  const right = sections[1] ? sections[1].split(':').filter(Boolean) : [];
  const missing = 8 - (left.length + right.length);
  const full = [...left, ...Array.from({ length: missing }, () => '0'), ...right];
  return Buffer.from(full.flatMap((s) => {
    const n = parseInt(s || '0', 16);
    return [(n >> 8) & 0xff, n & 0xff];
  }));
}

function cidrToPrefixBitString(cidr: string): { bits: Buffer; unusedBits: number } {
  const [ipStr, lenStr] = cidr.split('/');
  const prefixLen = parseInt(lenStr, 10);
  let ipBytes: Buffer;
  if (ipStr.includes('.')) {
    ipBytes = Buffer.from(ipStr.split('.').map(Number));
  } else {
    ipBytes = expandIPv6(ipStr);
  }
  const fullBytes = Math.ceil(prefixLen / 8);
  const unusedBits = fullBytes * 8 - prefixLen;
  const prefixBytes = Buffer.from(ipBytes.subarray(0, fullBytes));
  if (unusedBits > 0 && prefixBytes.length > 0) {
    const mask = (0xff << unusedBits) & 0xff;
    prefixBytes[prefixBytes.length - 1] &= mask;
  }
  return { bits: prefixBytes, unusedBits };
}

export interface RoaEntry {
  prefix: string;
  asn: number;
  maxLength: number;
}

/** Constrói o DER interno do RouteOriginAttestation (RFC 6482). */
export function buildRoaContent(entries: RoaEntry[]): Buffer {
  if (entries.length === 0) throw new Error('ROA sem prefixos');

  const asn = entries[0].asn;
  if (!entries.every((e) => e.asn === asn)) {
    throw new Error('buildRoaContent: todos os prefixos devem ter o mesmo ASN');
  }

  const ipv4 = entries.filter((e) => !e.prefix.includes(':'));
  const ipv6 = entries.filter((e) => e.prefix.includes(':'));

  function buildRoaIpAddress(e: RoaEntry): Buffer {
    const { bits, unusedBits } = cidrToPrefixBitString(e.prefix);
    const addrBS = derBitString(bits, unusedBits);
    const prefixLen = parseInt(e.prefix.split('/')[1], 10);
    if (e.maxLength === prefixLen) return SEQ(addrBS);
    return SEQ(Buffer.concat([addrBS, derIntegerUInt(e.maxLength)]));
  }

  function buildFamily(afi: Buffer, es: RoaEntry[]): Buffer {
    return SEQ(
      Buffer.concat([OCTET(afi), SEQ(Buffer.concat(es.map(buildRoaIpAddress)))])
    );
  }

  const families: Buffer[] = [];
  if (ipv4.length > 0) families.push(buildFamily(Buffer.from([0x00, 0x01]), ipv4));
  if (ipv6.length > 0) families.push(buildFamily(Buffer.from([0x00, 0x02]), ipv6));

  return SEQ(Buffer.concat([derIntegerUInt(asn), SEQ(Buffer.concat(families))]));
}

/**
 * IPAddrBlocks no certificado EE da ROA com prefixos explícitos (Krill: to_resources()).
 * Manifesto/ASPA continuam com inherit.
 */
export function buildRoaIpBlocksDerForEeCert(entries: RoaEntry[]): Buffer {
  const ipv4 = entries.filter((e) => !e.prefix.includes(':'));
  const ipv6 = entries.filter((e) => e.prefix.includes(':'));

  function buildCertIpAddress(e: RoaEntry): Buffer {
    const { bits, unusedBits } = cidrToPrefixBitString(e.prefix);
    // RFC 3779 / Krill IpBlock::Prefix: IPAddressPrefix ::= BIT STRING (maxLength só no conteúdo ROA).
    return derBitString(bits, unusedBits);
  }

  function buildFamily(afi: Buffer, es: RoaEntry[]): Buffer {
    // Krill IpResources::blocks: IPAddressChoice = SEQUENCE OF IPAddressOrRange (tag 0x30, não [0]).
    return SEQ(
      Buffer.concat([OCTET(afi), SEQ(Buffer.concat(es.map(buildCertIpAddress)))])
    );
  }

  const families: Buffer[] = [];
  if (ipv4.length > 0) families.push(buildFamily(Buffer.from([0x00, 0x01]), ipv4));
  if (ipv6.length > 0) families.push(buildFamily(Buffer.from([0x00, 0x02]), ipv6));
  if (families.length === 0) {
    throw new Error('ROA sem prefixos IPv4/IPv6 para certificado EE');
  }
  return SEQ(Buffer.concat(families));
}

// ─── Manifest content (RFC 9286) ─────────────────────────────────────────────

export interface ManifestFile {
  filename: string;
  sha256Hex: string;
}

export function buildManifestContent(params: {
  manifestNumber: number;
  thisUpdate: Date;
  nextUpdate: Date;
  files: ManifestFile[];
}): Buffer {
  const fileList = SEQ(
    Buffer.concat(
      params.files.map((f) => {
        const fileHash = Buffer.from(f.sha256Hex, 'hex');
        return SEQ(Buffer.concat([IA5(f.filename), derBitString(fileHash, 0)]));
      })
    )
  );

  const content = SEQ(
    Buffer.concat([
      // version [0] EXPLICIT DEFAULT 0 — omitido para v0
      derIntegerUInt(params.manifestNumber),
      derGeneralizedTime(params.thisUpdate),
      derGeneralizedTime(params.nextUpdate),
      derOid(OID_SHA256),
      fileList,
    ])
  );
  return content;
}

async function buildEeCertMaterial(params: {
  resourceCaCertPem: string;
  resourceCaKeyPem: string;
  resourceCertUrl: string;
  crlUri: string;
  objectUri: string;
  ipAddrBlocksDer?: Buffer;
  notBefore?: Date;
  notAfter?: Date;
}): Promise<{ certPem: string; keyPem: string }> {
  const resourceProfile = parseResourceCertProfile(params.resourceCaCertPem);
  const ipAddrBlocksExtDer =
    params.ipAddrBlocksDer ?? buildIpInheritDer(resourceProfile.hasIpv4, resourceProfile.hasIpv6);

  return issueRpkiEeCert({
    resourceCaCertPem: params.resourceCaCertPem,
    resourceCaKeyPem: params.resourceCaKeyPem,
    ipAddrBlocksDer: ipAddrBlocksExtDer,
    asIdentDer: resourceProfile.hasAsn ? buildAsInheritDer() : undefined,
    siaDer: buildSiaDer(params.objectUri),
    aiaDer: buildAiaDer(params.resourceCertUrl),
    crldpDer: buildCrldpDer(params.crlUri),
    notBefore: params.notBefore,
    notAfter: params.notAfter,
  });
}

async function buildSignedResourceCms(params: {
  contentDer: Buffer;
  contentOid: string;
  resourceCaCertPem: string;
  resourceCaKeyPem: string;
  resourceCertUrl: string;
  crlUri: string;
  objectUri: string;
  ipAddrBlocksDer?: Buffer;
  notBefore?: Date;
  notAfter?: Date;
}): Promise<{ derBuffer: Buffer; sha256Hex: string }> {
  const { certPem, keyPem } = await buildEeCertMaterial(params);
  const derBuffer = await signCmsAttached({
    content: params.contentDer,
    contentTypeOid: params.contentOid,
    signerCertPem: certPem,
    signerKeyPem: keyPem,
  });
  return {
    derBuffer,
    sha256Hex: crypto.createHash('sha256').update(derBuffer).digest('hex'),
  };
}

// ─── ROA completo (DER conteúdo + EE cert + CMS assinado) ───────────────────

export async function buildRoaCmsObject(params: {
  entries: RoaEntry[];
  resourceCaCertPem: string;
  resourceCaKeyPem: string;
  resourceCertUrl: string;
  crlUri: string;
  objectUri: string;
  /** Início da validade do EE (padrão: 5 min atrás). */
  notBefore?: Date;
  /** Fim da validade do EE (padrão: 52 semanas após notBefore). Usa data do ROA quando disponível. */
  notAfter?: Date;
}): Promise<{ derBuffer: Buffer; sha256Hex: string }> {
  assertRoaEntriesMatchResourceCert(params.entries, params.resourceCaCertPem);
  return buildSignedResourceCms({
    contentDer: buildRoaContent(params.entries),
    contentOid: OID_ROA_CONTENT_TYPE,
    resourceCaCertPem: params.resourceCaCertPem,
    resourceCaKeyPem: params.resourceCaKeyPem,
    resourceCertUrl: params.resourceCertUrl,
    crlUri: params.crlUri,
    objectUri: params.objectUri,
    ipAddrBlocksDer: buildRoaIpBlocksDerForEeCert(params.entries),
    notBefore: params.notBefore,
    notAfter: params.notAfter,
  });
}

// ─── ASPA content (RFC 9582) ─────────────────────────────────────────────────

export interface AspaEntry {
  customerAsn: number;
  /** ASNs provedores e, opcionalmente, restrição de AFI por provedor */
  providers: Array<{ providerAsn: number; afi?: 'ipv4' | 'ipv6' }>;
}

/**
 * Constrói o DER interno do ASProviderAttestation (RFC 9582).
 * ASProviderAttestation ::= SEQUENCE { customerASID ASID, providers ProviderASSet }
 * ProviderAS            ::= SEQUENCE { providerASID ASID, afiLimit AFI OPTIONAL }
 * AFI                   ::= OCTET STRING (SIZE (2)) — 0x0001=IPv4, 0x0002=IPv6
 */
export function buildAspaContent(entry: AspaEntry): Buffer {
  const providerDers = entry.providers.map((p) => {
    const asnDer = derIntegerUInt(p.providerAsn);
    if (!p.afi) return SEQ(asnDer);
    const afiBuf = p.afi === 'ipv4' ? Buffer.from([0x00, 0x01]) : Buffer.from([0x00, 0x02]);
    return SEQ(Buffer.concat([asnDer, OCTET(afiBuf)]));
  });
  return SEQ(Buffer.concat([derIntegerUInt(entry.customerAsn), SEQ(Buffer.concat(providerDers))]));
}

// ─── ASPA completo (DER conteúdo + EE cert + CMS assinado) ──────────────────

export async function buildAspaCmsObject(params: {
  entry: AspaEntry;
  resourceCaCertPem: string;
  resourceCaKeyPem: string;
  resourceCertUrl: string;
  crlUri: string;
  objectUri: string;
}): Promise<{ derBuffer: Buffer; sha256Hex: string }> {
  return buildSignedResourceCms({
    contentDer: buildAspaContent(params.entry),
    contentOid: OID_ASPA_CONTENT_TYPE,
    resourceCaCertPem: params.resourceCaCertPem,
    resourceCaKeyPem: params.resourceCaKeyPem,
    resourceCertUrl: params.resourceCertUrl,
    crlUri: params.crlUri,
    objectUri: params.objectUri,
  });
}

// ─── Manifest completo (DER conteúdo + EE cert + CMS assinado) ──────────────

export async function buildManifestCmsObject(params: {
  manifestNumber: number;
  thisUpdate: Date;
  nextUpdate: Date;
  files: ManifestFile[];
  resourceCaCertPem: string;
  resourceCaKeyPem: string;
  resourceCertUrl: string;
  crlUri: string;
  mftUri: string;
}): Promise<{ derBuffer: Buffer; sha256Hex: string }> {
  return buildSignedResourceCms({
    contentDer: buildManifestContent({
      manifestNumber: params.manifestNumber,
      thisUpdate: params.thisUpdate,
      nextUpdate: params.nextUpdate,
      files: params.files,
    }),
    contentOid: OID_MFT_CONTENT_TYPE,
    resourceCaCertPem: params.resourceCaCertPem,
    resourceCaKeyPem: params.resourceCaKeyPem,
    resourceCertUrl: params.resourceCertUrl,
    crlUri: params.crlUri,
    objectUri: params.mftUri,
    notBefore: params.thisUpdate,
    notAfter: params.nextUpdate,
  });
}
