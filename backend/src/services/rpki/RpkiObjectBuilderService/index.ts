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
import {
  assertRoaEntriesMatchResourceCert,
  buildAsInheritDer,
  buildIpInheritDer,
  bufToHexColon,
  parseResourceCertProfile,
} from '../RpkiCertProfile';

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
    // RFC 6487 (cert EE): IPAddress ::= BIT STRING — maxLength fica só no conteúdo ROA.
    return derBitString(bits, unusedBits);
  }

  function buildFamily(afi: Buffer, es: RoaEntry[]): Buffer {
    return SEQ(
      Buffer.concat([OCTET(afi), CTX0_CONS(SEQ(Buffer.concat(es.map(buildCertIpAddress))))])
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

export interface CrlRevocationEntry {
  serialHex: string;
  notAfter: Date;
}

function fmtOpenSslCertDate(d: Date): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function fmtOpenSslIndexDate(d: Date): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${yy}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Extrai serial e expiry do certificado EE embutido em CMS (ROA/MFT/ASPA). */
export async function extractEeRevocationFromCmsDer(cmsDer: Buffer): Promise<CrlRevocationEntry | null> {
  if (!cmsDer.length) return null;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpki-cms-rev-'));
  try {
    const cmsPath = path.join(tempDir, 'obj.cms');
    const certPath = path.join(tempDir, 'ee.pem');
    await fs.writeFile(cmsPath, cmsDer);
    await execFileAsync('openssl', [
      'cms', '-inform', 'DER', '-in', cmsPath, '-cmsout', '-print_certs', '-out', certPath,
    ]);
    const certPem = await fs.readFile(certPath, 'utf8');
    if (!certPem.includes('BEGIN CERTIFICATE')) return null;

    const { stdout: serialOut } = await execFileAsync('openssl', [
      'x509', '-in', certPath, '-serial', '-noout',
    ]);
    const { stdout: endOut } = await execFileAsync('openssl', [
      'x509', '-in', certPath, '-enddate', '-noout',
    ]);
    const serialMatch = serialOut.match(/serial=([0-9A-Fa-f]+)/);
    const endMatch = endOut.match(/notAfter=(.+)/);
    if (!serialMatch?.[1] || !endMatch?.[1]) return null;

    const notAfter = new Date(endMatch[1].trim());
    if (Number.isNaN(notAfter.getTime()) || notAfter <= new Date()) return null;

    return { serialHex: serialMatch[1].toUpperCase(), notAfter };
  } catch {
    return null;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
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
  /** Blocos IP explícitos (ROA). Se omitido, usa inherit. */
  ipAddrBlocksDer?: Buffer;
  /** Data de início da validade do EE (padrão: 5 min atrás, como Krill). */
  notBefore?: Date;
  /** Data de fim da validade do EE (padrão: notBefore + 52 semanas, como Krill). */
  notAfter?: Date;
  /** @deprecated use notBefore/notAfter */
  validHours?: number;
}

async function issueRpkiEeCert(
  params: EeCertParams
): Promise<{ certPem: string; keyPem: string }> {
  const resourceProfile = parseResourceCertProfile(params.resourceCaCertPem);
  const ipInheritDer = params.ipAddrBlocksDer ?? buildIpInheritDer(resourceProfile.hasIpv4, resourceProfile.hasIpv6);

  const nbDate = params.notBefore ?? new Date(Date.now() - 5 * 60 * 1000);
  const naDate = params.notAfter ?? new Date(nbDate.getTime() + 52 * 7 * 24 * 3600 * 1000);

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
      '-subj', '/',
      '-out', eeCsrPath,
    ]);

    const siaDer = buildSiaDer(params.objectUri);
    const aiaDer = buildAiaDer(params.resourceCertUrl);
    const crldpDer = buildCrldpDer(params.crlUri);

    const extLines = [
      '[v3_ee]',
      'basicConstraints = critical,CA:FALSE',
      'keyUsage = critical,digitalSignature',
      'subjectKeyIdentifier = hash',
      'authorityKeyIdentifier = keyid',
      `${OID_IP_ADDR_BLOCKS} = critical,DER:${bufToHexColon(ipInheritDer)}`,
    ];
    if (resourceProfile.hasAsn) {
      extLines.push(`${OID_AS_IDENT} = critical,DER:${bufToHexColon(buildAsInheritDer())}`);
    }
    extLines.push(
      `${OID_SIA} = DER:${bufToHexColon(siaDer)}`,
      `${OID_AIA} = DER:${bufToHexColon(aiaDer)}`,
      `${OID_CRLDP} = DER:${bufToHexColon(crldpDer)}`
    );
    await fs.writeFile(extPath, extLines.join('\n'), 'utf8');

    const validDays = Math.max(1, Math.ceil((naDate.getTime() - Date.now()) / (24 * 3600 * 1000)));

    await execFileAsync('openssl', [
      'x509', '-req',
      '-in', eeCsrPath,
      '-CA', caCertPath,
      '-CAkey', caKeyPath,
      '-CAcreateserial',
      '-days', String(validDays),
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
  thisUpdate?: Date;
  nextUpdate?: Date;
  /** EE de objetos CMS substituídos/retirados (Krill: revocations). */
  revocations?: CrlRevocationEntry[];
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

    const revokedAt = params.thisUpdate ?? new Date(Date.now() - 5 * 60 * 1000);
    const indexLines = (params.revocations ?? [])
      .filter((r) => r.notAfter > new Date())
      .map((r) => {
        const serial = r.serialHex.replace(/^0+/, '') || '0';
        return `R\t${fmtOpenSslIndexDate(r.notAfter)}\t${fmtOpenSslIndexDate(revokedAt)}\t${serial}\tunknown\t/`;
      });
    await fs.writeFile(indexPath, indexLines.length > 0 ? `${indexLines.join('\n')}\n` : '', 'utf8');
    // OpenSSL exige quantidade par de dígitos hex no arquivo crlnumber (ASN.1 INTEGER).
    let crlNumHex = params.crlNumber.toString(16).toUpperCase();
    if (crlNumHex.length % 2 === 1) {
      crlNumHex = `0${crlNumHex}`;
    }
    await fs.writeFile(crlNumPath, crlNumHex + '\n', 'utf8');

    // Calcula dias entre thisUpdate e nextUpdate para passar ao OpenSSL.
    const base = params.thisUpdate ?? new Date();
    const end = params.nextUpdate ?? new Date(base.getTime() + 24 * 3600 * 1000);
    const validDays = Math.max(1, Math.ceil((end.getTime() - base.getTime()) / (24 * 3600 * 1000)));

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
      'policy = policy_any',
      '[policy_any]',
      'commonName = optional',
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
  /** Início da validade do EE (padrão: 5 min atrás). */
  notBefore?: Date;
  /** Fim da validade do EE (padrão: 52 semanas após notBefore). Usa data do ROA quando disponível. */
  notAfter?: Date;
}): Promise<{ derBuffer: Buffer; sha256Hex: string }> {
  assertRoaEntriesMatchResourceCert(params.entries, params.resourceCaCertPem);
  const roaContent = buildRoaContent(params.entries);
  const { certPem, keyPem } = await issueRpkiEeCert({
    resourceCaCertPem: params.resourceCaCertPem,
    resourceCaKeyPem: params.resourceCaKeyPem,
    resourceCertUrl: params.resourceCertUrl,
    crlUri: params.crlUri,
    objectUri: params.objectUri,
    notBefore: params.notBefore,
    notAfter: params.notAfter,
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
  // EE do ASPA: padrão 5 min atrás / 52 semanas (como Krill).
  const { certPem, keyPem } = await issueRpkiEeCert({
    resourceCaCertPem: params.resourceCaCertPem,
    resourceCaKeyPem: params.resourceCaKeyPem,
    resourceCertUrl: params.resourceCertUrl,
    crlUri: params.crlUri,
    objectUri: params.objectUri,
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
  // EE do manifesto: notBefore = thisUpdate (já backdatado), notAfter = nextUpdate.
  const { certPem, keyPem } = await issueRpkiEeCert({
    resourceCaCertPem: params.resourceCaCertPem,
    resourceCaKeyPem: params.resourceCaKeyPem,
    resourceCertUrl: params.resourceCertUrl,
    crlUri: params.crlUri,
    objectUri: params.mftUri,
    notBefore: params.thisUpdate,
    notAfter: params.nextUpdate,
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
