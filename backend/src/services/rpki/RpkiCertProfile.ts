/**
 * Perfil de certificados RPKI (RFC 6487) — leitura do cert de recurso e DER de extensões EE.
 * Alinhado ao Krill: famílias IP/ASN no EE só quando presentes no certificado emissor.
 */
import forge from 'node-forge';

const OID_IP_ADDR_BLOCKS = '1.3.6.1.5.5.7.1.7';
const OID_AS_IDENT = '1.3.6.1.5.5.7.1.8';

export interface ResourceCertProfile {
  hasIpv4: boolean;
  hasIpv6: boolean;
  hasAsn: boolean;
}

function extensionDerBytes(ext: { value?: unknown }): Buffer | null {
  const raw = ext.value;
  if (raw == null) return null;
  if (Buffer.isBuffer(raw)) return raw;
  if (typeof raw === 'string') {
    if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) {
      return Buffer.from(raw, 'hex');
    }
    return Buffer.from(raw, 'binary');
  }
  return null;
}

/** Percorre IPAddrBlocks (SEQUENCE OF IPAddressFamily) e detecta AFI 0001/0002. */
function parseIpAddrBlocksDer(der: Buffer): { ipv4: boolean; ipv6: boolean } {
  let ipv4 = false;
  let ipv6 = false;
  if (!der.length || der[0] !== 0x30) return { ipv4, ipv6 };

  const readLen = (off: number): { value: number; size: number } => {
    const b = der[off];
    if (b < 0x80) return { value: b, size: 1 };
    const n = b & 0x7f;
    let v = 0;
    for (let i = 1; i <= n; i++) v = (v << 8) | der[off + i];
    return { value: v, size: 1 + n };
  };

  const tlvSize = (off: number): number => {
    const len = readLen(off + 1);
    return 1 + len.size + len.value;
  };

  const outerLen = readLen(1);
  let p = 1 + outerLen.size;
  const seqEnd = p + outerLen.value;

  while (p < seqEnd) {
    if (der[p] !== 0x30) break;
    const famSize = tlvSize(p);
    const famEnd = p + famSize;
    let q = p + 1 + readLen(p + 1).size;

    if (q < famEnd && der[q] === 0x04) {
      const octLen = readLen(q + 1);
      const afiStart = q + 1 + octLen.size;
      const afi = der.subarray(afiStart, afiStart + octLen.value);
      if (afi.length >= 2) {
        if (afi[0] === 0x00 && afi[1] === 0x01) ipv4 = true;
        if (afi[0] === 0x00 && afi[1] === 0x02) ipv6 = true;
      }
    }
    p = famEnd;
  }

  return { ipv4, ipv6 };
}

export function parseResourceCertProfile(certPem: string): ResourceCertProfile {
  const cert = forge.pki.certificateFromPem(certPem);
  let hasIpv4 = false;
  let hasIpv6 = false;
  let hasAsn = false;

  for (const ext of cert.extensions ?? []) {
    const oid = String(ext.id ?? '');
    if (oid === OID_IP_ADDR_BLOCKS) {
      const der = extensionDerBytes(ext);
      if (der) {
        const parsed = parseIpAddrBlocksDer(der);
        hasIpv4 = parsed.ipv4;
        hasIpv6 = parsed.ipv6;
      }
    }
    if (oid === OID_AS_IDENT) {
      hasAsn = true;
    }
  }

  return { hasIpv4, hasIpv6, hasAsn };
}

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
const NULL_DER = () => Buffer.from([0x05, 0x00]);
const CTX0_CONS = (v: Buffer) => tlv(0xa0, v);

/** id-pe-ipAddrBlocks: inherit só nas famílias presentes no cert de recurso (RFC 6487). */
export function buildIpInheritDer(hasIpv4: boolean, hasIpv6: boolean): Buffer {
  const families: Buffer[] = [];
  if (hasIpv4) {
    families.push(SEQ(Buffer.concat([OCTET(Buffer.from([0x00, 0x01])), NULL_DER()])));
  }
  if (hasIpv6) {
    families.push(SEQ(Buffer.concat([OCTET(Buffer.from([0x00, 0x02])), NULL_DER()])));
  }
  if (families.length === 0) {
    throw new Error('Certificado de recurso sem blocos IPv4/IPv6 — não é possível emitir EE de objeto assinado.');
  }
  return SEQ(Buffer.concat(families));
}

/** id-pe-autonomousSysNum com inherit. */
export function buildAsInheritDer(): Buffer {
  return SEQ(CTX0_CONS(NULL_DER()));
}

export function bufToHexColon(buf: Buffer): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(':');
}

export interface RoaEntryForValidation {
  prefix: string;
}

export function assertRoaEntriesMatchResourceCert(
  entries: RoaEntryForValidation[],
  resourceCertPem: string
): void {
  const profile = parseResourceCertProfile(resourceCertPem);
  for (const entry of entries) {
    const isV6 = entry.prefix.includes(':');
    if (isV6 && !profile.hasIpv6) {
      throw new Error(
        'ROA IPv6 não pode ser assinada: o certificado de recurso atual não delega IPv6. Sincronize/renove o cert no parent.'
      );
    }
    if (!isV6 && !profile.hasIpv4) {
      throw new Error(
        'ROA IPv4 não pode ser assinada: o certificado de recurso atual não delega IPv4. Sincronize/renove o cert no parent.'
      );
    }
  }
}
