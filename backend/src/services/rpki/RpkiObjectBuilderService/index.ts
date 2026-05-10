/**
 * RpkiObjectBuilderService
 *
 * Constrói objetos RPKI (ROA, Manifest, CRL) e certificados EE (End-Entity)
 * seguindo os padrões RFC 6482 (ROA), RFC 9286 (Manifest), RFC 5280 (CRL/cert)
 * e RFC 6487 (perfil RPKI para certificados/CRL).
 *
 * O pipeline por objeto é:
 *   1. Construir conteúdo DER do objeto (RouteOriginAttestation / Manifest)
 *   2. Emitir certificado EE assinado pelo resource CA (via OpenSSL)
 *   3. Assinar o conteúdo com CMS (via openssl cms -sign)
 *   4. Retornar DER final + SHA-256 para publicação
 */
import forge from 'node-forge';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execFileAsync = promisify(execFile);

// ─── OIDs usados em objetos RPKI ─────────────────────────────────────────────
const OID_ROA_CONTENT_TYPE  = '1.2.840.113549.1.9.16.1.24';
const OID_MFT_CONTENT_TYPE  = '1.2.840.113549.1.9.16.1.26';
const OID_ASPA_CONTENT_TYPE = '1.2.840.113549.1.9.16.1.49';
const OID_SHA256 = '2.16.840.1.101.3.4.2.1';
// id-pe-ipAddrBlocks / id-pe-autonomousSysNum
const OID_IP_ADDR_BLOCKS = '1.3.6.1.5.5.7.1.7';
const OID_AS_IDENT = '1.3.6.1.5.5.7.1.8';
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

/** id-pe-ipAddrBlocks com "inherit" para IPv4 e IPv6 */
const IP_INHERIT_DER = SEQ(
  Buffer.concat([
    SEQ(Buffer.concat([OCTET(Buffer.from([0x00, 0x01])), NULL_DER()])), // IPv4
    SEQ(Buffer.concat([OCTET(Buffer.from([0x00, 0x02])), NULL_DER()])), // IPv6
  ])
);

/** id-pe-autonomousSysNum com "inherit" */
const AS_INHERIT_DER = SEQ(CTX0_CONS(NULL_DER()));

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

function bufToHexColon(buf: Buffer): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(':');
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

// ─── Geração de chave + certificado EE via OpenSSL ──────────────────────────

interface EeCertParams {
  resourceCaCertPem: string;
  resourceCaKeyPem: string;
  resourceCertUrl: string;
  crlUri: string;
  objectUri: string;
  validHours?: number;
}

async function issueRpkiEeCert(
  params: EeCertParams
): Promise<{ certPem: string; keyPem: string }> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpki-ee-'));
  try {
    const caKeyPath = path.join(tempDir, 'ca_key.pem');
    const caCertPath = path.join(tempDir, 'ca_cert.pem');
    const eeKeyPath = path.join(tempDir, 'ee_key.pem');
    const eeCsrPath = path.join(tempDir, 'ee_csr.pem');
    const eeCertPath = path.join(tempDir, 'ee_cert.pem');
    const extPath = path.join(tempDir, 'ee_ext.cnf');

    await fs.writeFile(caKeyPath, params.resourceCaKeyPem, 'utf8');
    await fs.writeFile(caCertPath, params.resourceCaCertPem, 'utf8');

    await execFileAsync('openssl', ['genrsa', '-out', eeKeyPath, '2048']);
    await execFileAsync('openssl', [
      'req', '-new', '-key', eeKeyPath,
      '-subj', '/CN=RPKI-EE',
      '-out', eeCsrPath,
    ]);

    const siaDer = buildSiaDer(params.objectUri);
    const aiaDer = buildAiaDer(params.resourceCertUrl);
    const crldpDer = buildCrldpDer(params.crlUri);

    const extCnf = [
      '[v3_ee]',
      'basicConstraints = critical,CA:FALSE',
      'keyUsage = critical,digitalSignature',
      'subjectKeyIdentifier = hash',
      'authorityKeyIdentifier = keyid',
      // RPKI: IP resources inherit (IPv4 + IPv6)
      `${OID_IP_ADDR_BLOCKS} = critical,DER:${bufToHexColon(IP_INHERIT_DER)}`,
      // RPKI: ASN inherit
      `${OID_AS_IDENT} = critical,DER:${bufToHexColon(AS_INHERIT_DER)}`,
      // SIA: signedObject pointing to this object
      `${OID_SIA} = DER:${bufToHexColon(siaDer)}`,
      // AIA: caIssuers pointing to resource CA cert
      `${OID_AIA} = DER:${bufToHexColon(aiaDer)}`,
      // CRL Distribution Points
      `${OID_CRLDP} = DER:${bufToHexColon(crldpDer)}`,
    ].join('\n');

    await fs.writeFile(extPath, extCnf, 'utf8');

    const validDays = Math.max(1, Math.ceil((params.validHours ?? 24) / 24));
    await execFileAsync('openssl', [
      'x509', '-req',
      '-days', String(validDays),
      '-in', eeCsrPath,
      '-CA', caCertPath,
      '-CAkey', caKeyPath,
      '-CAcreateserial',
      '-extfile', extPath,
      '-extensions', 'v3_ee',
      '-out', eeCertPath,
    ]);

    const [certPem, keyPem] = await Promise.all([
      fs.readFile(eeCertPath, 'utf8'),
      fs.readFile(eeKeyPath, 'utf8'),
    ]);
    return { certPem, keyPem };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

// ─── CMS signing (openssl cms -sign) ────────────────────────────────────────

async function signRpkiCms(params: {
  contentDer: Buffer;
  contentOid: string;
  eeCertPem: string;
  eeKeyPem: string;
}): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpki-cms-'));
  try {
    const contentPath = path.join(tempDir, 'content.der');
    const certPath = path.join(tempDir, 'ee_cert.pem');
    const keyPath = path.join(tempDir, 'ee_key.pem');
    const outPath = path.join(tempDir, 'signed.der');

    await fs.writeFile(contentPath, params.contentDer);
    await fs.writeFile(certPath, params.eeCertPem, 'utf8');
    await fs.writeFile(keyPath, params.eeKeyPem, 'utf8');

    await execFileAsync('openssl', [
      'cms', '-sign',
      '-binary', '-nodetach', '-nosmimecap',
      '-in', contentPath,
      '-signer', certPath,
      '-inkey', keyPath,
      '-econtent_type', params.contentOid,
      '-md', 'sha256',
      '-keyid',
      '-outform', 'DER',
      '-out', outPath,
    ]);

    return await fs.readFile(outPath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

// ─── CRL via OpenSSL CA (mínima, sem revogações) ────────────────────────────

export async function buildCrlDer(params: {
  resourceCaCertPem: string;
  resourceCaKeyPem: string;
  crlNumber: number;
  validHours?: number;
}): Promise<{ derBuffer: Buffer; sha256Hex: string }> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpki-crl-'));
  try {
    const caKeyPath = path.join(tempDir, 'ca_key.pem');
    const caCertPath = path.join(tempDir, 'ca_cert.pem');
    const indexPath = path.join(tempDir, 'index.txt');
    const crlNumPath = path.join(tempDir, 'crlnumber');
    const cnfPath = path.join(tempDir, 'openssl.cnf');
    const crlPemPath = path.join(tempDir, 'crl.pem');
    const crlDerPath = path.join(tempDir, 'crl.der');

    await fs.writeFile(caKeyPath, params.resourceCaKeyPem, 'utf8');
    await fs.writeFile(caCertPath, params.resourceCaCertPem, 'utf8');
    await fs.writeFile(indexPath, '', 'utf8');
    const crlNumHex = params.crlNumber.toString(16).padStart(2, '0').toUpperCase();
    await fs.writeFile(crlNumPath, crlNumHex + '\n', 'utf8');

    const validDays = Math.max(1, Math.ceil((params.validHours ?? 24) / 24));
    const cnf = [
      '[ca]',
      'default_ca = CA_default',
      '[CA_default]',
      `dir = ${tempDir}`,
      `certificate = ${caCertPath}`,
      `private_key = ${caKeyPath}`,
      `database = ${indexPath}`,
      `crlnumber = ${crlNumPath}`,
      `default_crl_days = ${validDays}`,
      'default_md = sha256',
      '[crl_ext]',
      'authorityKeyIdentifier = keyid:always',
    ].join('\n');

    await fs.writeFile(cnfPath, cnf, 'utf8');

    await execFileAsync('openssl', [
      'ca', '-config', cnfPath,
      '-gencrl', '-crlexts', 'crl_ext',
      '-out', crlPemPath,
    ]);

    await execFileAsync('openssl', [
      'crl', '-in', crlPemPath, '-outform', 'DER', '-out', crlDerPath,
    ]);

    const derBuffer = await fs.readFile(crlDerPath);
    const sha256Hex = crypto.createHash('sha256').update(derBuffer).digest('hex');
    return { derBuffer, sha256Hex };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

// ─── ROA completo (DER conteúdo + EE cert + CMS assinado) ───────────────────

export async function buildRoaCmsObject(params: {
  entries: RoaEntry[];
  resourceCaCertPem: string;
  resourceCaKeyPem: string;
  resourceCertUrl: string;
  crlUri: string;
  objectUri: string;
}): Promise<{ derBuffer: Buffer; sha256Hex: string }> {
  const roaContent = buildRoaContent(params.entries);
  const { certPem, keyPem } = await issueRpkiEeCert({
    resourceCaCertPem: params.resourceCaCertPem,
    resourceCaKeyPem: params.resourceCaKeyPem,
    resourceCertUrl: params.resourceCertUrl,
    crlUri: params.crlUri,
    objectUri: params.objectUri,
    validHours: 24,
  });
  const derBuffer = await signRpkiCms({
    contentDer: roaContent,
    contentOid: OID_ROA_CONTENT_TYPE,
    eeCertPem: certPem,
    eeKeyPem: keyPem,
  });
  const sha256Hex = crypto.createHash('sha256').update(derBuffer).digest('hex');
  return { derBuffer, sha256Hex };
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
  const aspaContent = buildAspaContent(params.entry);
  const { certPem, keyPem } = await issueRpkiEeCert({
    resourceCaCertPem: params.resourceCaCertPem,
    resourceCaKeyPem: params.resourceCaKeyPem,
    resourceCertUrl: params.resourceCertUrl,
    crlUri: params.crlUri,
    objectUri: params.objectUri,
    validHours: 24,
  });
  const derBuffer = await signRpkiCms({
    contentDer: aspaContent,
    contentOid: OID_ASPA_CONTENT_TYPE,
    eeCertPem: certPem,
    eeKeyPem: keyPem,
  });
  const sha256Hex = crypto.createHash('sha256').update(derBuffer).digest('hex');
  return { derBuffer, sha256Hex };
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
  const mftContent = buildManifestContent({
    manifestNumber: params.manifestNumber,
    thisUpdate: params.thisUpdate,
    nextUpdate: params.nextUpdate,
    files: params.files,
  });
  const { certPem, keyPem } = await issueRpkiEeCert({
    resourceCaCertPem: params.resourceCaCertPem,
    resourceCaKeyPem: params.resourceCaKeyPem,
    resourceCertUrl: params.resourceCertUrl,
    crlUri: params.crlUri,
    objectUri: params.mftUri,
    validHours: 24,
  });
  const derBuffer = await signRpkiCms({
    contentDer: mftContent,
    contentOid: OID_MFT_CONTENT_TYPE,
    eeCertPem: certPem,
    eeKeyPem: keyPem,
  });
  const sha256Hex = crypto.createHash('sha256').update(derBuffer).digest('hex');
  return { derBuffer, sha256Hex };
}
