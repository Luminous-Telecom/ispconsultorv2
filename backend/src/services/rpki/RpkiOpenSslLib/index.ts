/**
 * Criptografia RPKI in-process (OpenSSL via Node.js crypto + @peculiar/x509 + pkijs).
 *
 * Equivalente ao Krill OpenSslSigner: RSA-2048 / SHA-256, sem invocar o binário `openssl`.
 */
import 'reflect-metadata';
import crypto from 'crypto';
import forge from 'node-forge';
import { Crypto, CryptoKey } from '@peculiar/webcrypto';
import {
  AuthorityKeyIdentifierExtension,
  BasicConstraintsExtension,
  cryptoProvider,
  Extension,
  KeyUsageFlags,
  KeyUsagesExtension,
  Pkcs10CertificateRequestGenerator,
  SubjectKeyIdentifierExtension,
  X509Certificate,
  X509CertificateGenerator,
  X509CrlGenerator,
} from '@peculiar/x509';
import * as pkijs from 'pkijs';
import * as asn1js from 'asn1js';
import { injectRpkiCrlFieldIntoSignedDataCms } from '../RpkiCmsCrl';

const webCrypto = new Crypto();
cryptoProvider.set(webCrypto as unknown as Crypto);
const pkijsEngine = new pkijs.CryptoEngine({
  name: 'backnet-rpki',
  crypto: webCrypto as unknown as Crypto,
});
pkijs.setEngine('backnet-rpki', webCrypto as unknown as Crypto, pkijsEngine);

const OID_RPKI_XML_CONTENT = '1.2.840.113549.1.9.16.1.28';

function pemToDer(pem: string): Buffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  return Buffer.from(b64, 'base64');
}

async function importPrivateKeyPem(pem: string): Promise<CryptoKey> {
  return webCrypto.subtle.importKey(
    'pkcs8',
    pemToDer(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function importPublicKeyFromPrivateKeyPem(pem: string): Promise<CryptoKey> {
  const privateKey = forge.pki.privateKeyFromPem(pem) as forge.pki.rsa.PrivateKey;
  const publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e);
  const spkiDer = forge.asn1.toDer(forge.pki.publicKeyToAsn1(publicKey)).getBytes();
  return webCrypto.subtle.importKey(
    'spki',
    Buffer.from(spkiDer, 'binary'),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    true,
    ['verify']
  );
}

function pkijsCertFromPem(certPem: string): pkijs.Certificate {
  return pkijs.Certificate.fromBER(pemToDer(certPem));
}

function subjectKeyIdentifierFromCertPem(certPem: string): Buffer | null {
  try {
    const cert = forge.pki.certificateFromPem(certPem);
    const ext = cert.getExtension('subjectKeyIdentifier') as { subjectKeyIdentifier?: string } | undefined;
    if (!ext?.subjectKeyIdentifier) return null;
    return Buffer.from(ext.subjectKeyIdentifier.replace(/:/g, ''), 'hex');
  } catch {
    return null;
  }
}

async function authorityKeyIdentifierFromCertPem(certPem: string): Promise<AuthorityKeyIdentifierExtension> {
  const ski = subjectKeyIdentifierFromCertPem(certPem);
  const skiHex = ski ? ski.toString('hex').toUpperCase() : null;
  if (skiHex) {
    return new AuthorityKeyIdentifierExtension(skiHex, false);
  }
  const cert = new X509Certificate(certPem);
  return AuthorityKeyIdentifierExtension.create(cert.publicKey, false);
}

function sanitizeCnForCert(hexSki: string): string {
  return hexSki.replace(/[^A-Za-z0-9]/g, '').slice(0, 64) || 'RPKI';
}

function randomSerialHex(bytes = 8): string {
  return crypto.randomBytes(bytes).toString('hex').toUpperCase();
}

async function generateRsaKeyPair(): Promise<string> {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 0x10001,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  return privateKey;
}

function buildSignerSid(
  pkijsCert: pkijs.Certificate,
  certPem: string
): { sid: pkijs.IssuerAndSerialNumber | asn1js.Primitive; version: number } {
  const ski = subjectKeyIdentifierFromCertPem(certPem);
  if (ski) {
    return {
      version: 3,
      sid: new asn1js.Primitive({
        valueHex: ski.buffer.slice(ski.byteOffset, ski.byteOffset + ski.byteLength) as ArrayBuffer,
        idBlock: { tagClass: 3, tagNumber: 0, isConstructed: false },
      }),
    };
  }
  return {
    version: 1,
    sid: new pkijs.IssuerAndSerialNumber({
      issuer: pkijsCert.issuer,
      serialNumber: pkijsCert.serialNumber,
    }),
  };
}

async function buildSignedAttrs(contentTypeOid: string, content: Buffer): Promise<pkijs.SignedAndUnsignedAttributes> {
  const contentBuf = content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) as ArrayBuffer;
  const digest = await webCrypto.subtle.digest('SHA-256', contentBuf);
  return new pkijs.SignedAndUnsignedAttributes({
    type: 0,
    attributes: [
      new pkijs.Attribute({
        type: '1.2.840.113549.1.9.3',
        values: [new asn1js.ObjectIdentifier({ value: contentTypeOid })],
      }),
      new pkijs.Attribute({
        type: '1.2.840.113549.1.9.5',
        values: [new asn1js.UTCTime({ valueDate: new Date() })],
      }),
      new pkijs.Attribute({
        type: '1.2.840.113549.1.9.4',
        values: [new asn1js.OctetString({ valueHex: digest })],
      }),
    ],
  });
}

/** SHA-1 do DER SubjectPublicKeyInfo (KeyIdentifier RPKI / RFC 6487). */
export async function computeRpkiKeyIdentifierHexFromPrivateKeyPem(privateKeyPem: string): Promise<string> {
  const publicKey = await importPublicKeyFromPrivateKeyPem(privateKeyPem);
  const spkiDer = await webCrypto.subtle.exportKey('spki', publicKey);
  return crypto.createHash('sha1').update(Buffer.from(spkiDer)).digest('hex').toUpperCase();
}

async function createSelfSignedCert(params: {
  privateKeyPem: string;
  cn: string;
  notBefore: Date;
  notAfter: Date;
  extensions: Extension[];
}): Promise<string> {
  const privateKey = await importPrivateKeyPem(params.privateKeyPem);
  const publicKey = await importPublicKeyFromPrivateKeyPem(params.privateKeyPem);
  const cert = await X509CertificateGenerator.createSelfSigned({
    serialNumber: randomSerialHex(),
    name: `CN=${params.cn}`,
    notBefore: params.notBefore,
    notAfter: params.notAfter,
    keys: { privateKey, publicKey },
    signingAlgorithm: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    extensions: params.extensions,
  });
  return cert.toString('pem');
}

async function createCaSignedCert(params: {
  caCertPem: string;
  caKeyPem: string;
  subjectKeyPem: string;
  subject: string;
  notBefore: Date;
  notAfter: Date;
  extensions: Extension[];
  serialNumber?: string;
}): Promise<string> {
  const caPrivateKey = await importPrivateKeyPem(params.caKeyPem);
  const subjectPublicKey = await importPublicKeyFromPrivateKeyPem(params.subjectKeyPem);
  const caCert = new X509Certificate(params.caCertPem);

  const cert = await X509CertificateGenerator.create({
    serialNumber: params.serialNumber ?? randomSerialHex(),
    subject: params.subject,
    issuer: caCert.issuer,
    notBefore: params.notBefore,
    notAfter: params.notAfter,
    signingKey: caPrivateKey,
    signingAlgorithm: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    publicKey: subjectPublicKey,
    extensions: params.extensions,
  });

  return cert.toString('pem');
}

export async function signCmsAttached(params: {
  content: Buffer;
  contentTypeOid: string;
  signerCertPem: string;
  signerKeyPem: string;
}): Promise<Buffer> {
  const privateKey = await importPrivateKeyPem(params.signerKeyPem);
  const pkijsCert = pkijsCertFromPem(params.signerCertPem);
  const { sid, version } = buildSignerSid(pkijsCert, params.signerCertPem);
  const signedAttrs = await buildSignedAttrs(params.contentTypeOid, params.content);

  const contentBuf = params.content.buffer.slice(
    params.content.byteOffset,
    params.content.byteOffset + params.content.byteLength
  ) as ArrayBuffer;

  const cmsSigned = new pkijs.SignedData({
    version: 3,
    encapContentInfo: new pkijs.EncapsulatedContentInfo({
      eContentType: params.contentTypeOid,
      eContent: new asn1js.OctetString({ valueHex: contentBuf }),
    }),
    signerInfos: [new pkijs.SignerInfo({ version, sid, signedAttrs })],
    certificates: [pkijsCert],
  });

  await cmsSigned.sign(privateKey, 0, 'SHA-256');

  const cms = new pkijs.ContentInfo({
    contentType: pkijs.ContentInfo.SIGNED_DATA,
    content: cmsSigned.toSchema(true),
  });

  return Buffer.from(cms.toSchema().toBER(false));
}

export async function extractCmsContent(cmsDer: Buffer): Promise<Buffer> {
  const cms = pkijs.ContentInfo.fromBER(cmsDer);
  if (cms.contentType !== pkijs.ContentInfo.SIGNED_DATA) {
    throw new Error('CMS não é SignedData');
  }
  const signedData = new pkijs.SignedData({ schema: cms.content });
  const eContent = signedData.encapContentInfo.eContent;
  if (!eContent) throw new Error('CMS sem conteúdo encapsulado');
  return Buffer.from(eContent.getValue());
}

export async function extractCmsContentAsUtf8(cmsDer: Buffer): Promise<string> {
  return (await extractCmsContent(cmsDer)).toString('utf8');
}

export async function extractEeRevocationFromCmsDer(
  cmsDer: Buffer
): Promise<{ serialHex: string; notAfter: Date } | null> {
  try {
    const cms = pkijs.ContentInfo.fromBER(cmsDer);
    if (cms.contentType !== pkijs.ContentInfo.SIGNED_DATA) return null;
    const signedData = new pkijs.SignedData({ schema: cms.content });
    const certs = signedData.certificates;
    if (!certs || certs.length === 0) return null;
    const cert = certs[0] as pkijs.Certificate;
    const serialHex = Buffer.from(cert.serialNumber.valueBlock.valueHexView).toString('hex').toUpperCase();
    const notAfter = cert.notAfter.value;
    if (!(notAfter instanceof Date) || Number.isNaN(notAfter.getTime()) || notAfter <= new Date()) return null;
    return { serialHex, notAfter };
  } catch {
    return null;
  }
}

/** IdCert TA (Krill IdCert::new_ta). */
export async function issueIdCertTa(privateKeyPem: string): Promise<string> {
  const publicKey = await importPublicKeyFromPrivateKeyPem(privateKeyPem);
  const skiHex = await computeRpkiKeyIdentifierHexFromPrivateKeyPem(privateKeyPem);
  const cn = sanitizeCnForCert(skiHex);
  const notBefore = new Date(Date.now() - 5 * 60 * 1000);
  const notAfter = new Date(notBefore.getTime() + 5475 * 24 * 3600 * 1000);
  return createSelfSignedCert({
    privateKeyPem,
    cn,
    notBefore,
    notAfter,
    extensions: [
      new BasicConstraintsExtension(true, undefined, true),
      await SubjectKeyIdentifierExtension.create(publicKey, false),
    ],
  });
}

/** IdCert EE emitido pela TA (Krill IdCert::new_ee). */
export async function issueIdCertEe(params: {
  taCertPem: string;
  taKeyPem: string;
  eeKeyPem: string;
}): Promise<string> {
  const skiHex = await computeRpkiKeyIdentifierHexFromPrivateKeyPem(params.eeKeyPem);
  const cn = sanitizeCnForCert(skiHex);
  const eePublicKey = await importPublicKeyFromPrivateKeyPem(params.eeKeyPem);
  const notBefore = new Date(Date.now() - 5 * 60 * 1000);
  const notAfter = new Date(notBefore.getTime() + 24 * 3600 * 1000);
  return createCaSignedCert({
    caCertPem: params.taCertPem,
    caKeyPem: params.taKeyPem,
    subjectKeyPem: params.eeKeyPem,
    subject: `CN=${cn}`,
    notBefore,
    notAfter,
    extensions: [
      new BasicConstraintsExtension(false, undefined, false),
      await SubjectKeyIdentifierExtension.create(eePublicKey, false),
      await authorityKeyIdentifierFromCertPem(params.taCertPem),
    ],
  });
}

export async function generateBpkiCrlDer(certPem: string, keyPem: string): Promise<Buffer> {
  const caPrivateKey = await importPrivateKeyPem(keyPem);
  const caCert = new X509Certificate(certPem);
  const thisUpdate = new Date(Date.now() - 5 * 60 * 1000);
  const nextUpdate = new Date(thisUpdate.getTime() + 24 * 3600 * 1000);
  const crl = await X509CrlGenerator.create({
    issuer: caCert.issuer,
    thisUpdate,
    nextUpdate,
    signingKey: caPrivateKey,
    signingAlgorithm: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    extensions: [await authorityKeyIdentifierFromCertPem(certPem)],
  });
  return Buffer.from(crl.rawData);
}

export async function signKrillIdCertCms(xml: string, taCertPem: string, taKeyPem: string): Promise<Buffer> {
  const eeKeyPem = await generateRsaKeyPair();
  const eeCertPem = await issueIdCertEe({ taCertPem, taKeyPem, eeKeyPem });
  const raw = await signCmsAttached({
    content: Buffer.from(xml, 'utf8'),
    contentTypeOid: OID_RPKI_XML_CONTENT,
    signerCertPem: eeCertPem,
    signerKeyPem: eeKeyPem,
  });
  const crlDer = await generateBpkiCrlDer(taCertPem, taKeyPem);
  return injectRpkiCrlFieldIntoSignedDataCms(raw, crlDer);
}

export interface IssueRpkiEeCertParams {
  resourceCaCertPem: string;
  resourceCaKeyPem: string;
  ipAddrBlocksDer?: Buffer;
  asIdentDer?: Buffer;
  siaDer: Buffer;
  aiaDer: Buffer;
  crldpDer: Buffer;
  notBefore?: Date;
  notAfter?: Date;
}

export async function issueRpkiEeCert(params: IssueRpkiEeCertParams): Promise<{ certPem: string; keyPem: string }> {
  const privateKeyPem = await generateRsaKeyPair();
  const subjectPublicKey = await importPublicKeyFromPrivateKeyPem(privateKeyPem);
  const nbDate = params.notBefore ?? new Date(Date.now() - 5 * 60 * 1000);
  const naDate = params.notAfter ?? new Date(nbDate.getTime() + 52 * 7 * 24 * 3600 * 1000);

  const extensions: Extension[] = [
    new BasicConstraintsExtension(false, undefined, true),
    new KeyUsagesExtension(KeyUsageFlags.digitalSignature, true),
    await SubjectKeyIdentifierExtension.create(subjectPublicKey, false),
    await authorityKeyIdentifierFromCertPem(params.resourceCaCertPem),
  ];

  if (params.ipAddrBlocksDer) {
    extensions.push(new Extension('1.3.6.1.5.5.7.1.7', true, params.ipAddrBlocksDer));
  }
  if (params.asIdentDer) {
    extensions.push(new Extension('1.3.6.1.5.5.7.1.8', true, params.asIdentDer));
  }

  extensions.push(
    new Extension('1.3.6.1.5.5.7.1.11', false, params.siaDer),
    new Extension('1.3.6.1.5.5.7.1.1', false, params.aiaDer),
    new Extension('2.5.29.31', false, params.crldpDer)
  );

  const certPem = await createCaSignedCert({
    caCertPem: params.resourceCaCertPem,
    caKeyPem: params.resourceCaKeyPem,
    subjectKeyPem: privateKeyPem,
    subject: '',
    notBefore: nbDate,
    notAfter: naDate,
    extensions,
  });

  return { certPem, keyPem: privateKeyPem };
}

export interface CrlRevocationEntry {
  serialHex: string;
  notAfter: Date;
}

function encodeCrlNumberDer(n: number): Buffer {
  let hex = n.toString(16).toUpperCase();
  if (hex.length % 2 === 1) hex = `0${hex}`;
  const bytes = Buffer.from(hex, 'hex');
  const intBytes = bytes[0] >= 0x80 ? Buffer.concat([Buffer.from([0x00]), bytes]) : bytes;
  return Buffer.concat([Buffer.from([0x02, intBytes.length]), intBytes]);
}

export async function buildCrlDer(params: {
  resourceCaCertPem: string;
  resourceCaKeyPem: string;
  crlNumber: number;
  thisUpdate?: Date;
  nextUpdate?: Date;
  revocations?: CrlRevocationEntry[];
}): Promise<{ derBuffer: Buffer; sha256Hex: string }> {
  const caPrivateKey = await importPrivateKeyPem(params.resourceCaKeyPem);
  const caCert = new X509Certificate(params.resourceCaCertPem);
  const thisUpdate = params.thisUpdate ?? new Date(Date.now() - 5 * 60 * 1000);
  const nextUpdate = params.nextUpdate ?? new Date(thisUpdate.getTime() + 24 * 3600 * 1000);

  const entries = (params.revocations ?? [])
    .filter((r) => r.notAfter > new Date())
    .map((r) => ({
      serialNumber: r.serialHex.replace(/^0+/, '') || '0',
      revocationDate: thisUpdate,
    }));

  const crl = await X509CrlGenerator.create({
    issuer: caCert.issuer,
    thisUpdate,
    nextUpdate,
    signingKey: caPrivateKey,
    signingAlgorithm: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    entries,
    extensions: [
      await authorityKeyIdentifierFromCertPem(params.resourceCaCertPem),
      new Extension('2.5.29.20', false, encodeCrlNumberDer(params.crlNumber)),
    ],
  });

  const derBuffer = Buffer.from(crl.rawData);
  return {
    derBuffer,
    sha256Hex: crypto.createHash('sha256').update(derBuffer).digest('hex'),
  };
}

export async function generateRpkiCsr(params: {
  siaDer: Buffer;
}): Promise<{ keyPem: string; csrBase64: string }> {
  const privateKeyPem = await generateRsaKeyPair();
  const privateKey = await importPrivateKeyPem(privateKeyPem);
  const publicKey = await importPublicKeyFromPrivateKeyPem(privateKeyPem);

  const csr = await Pkcs10CertificateRequestGenerator.create({
    name: '',
    keys: { privateKey, publicKey },
    signingAlgorithm: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    extensions: [
      new BasicConstraintsExtension(true, undefined, true),
      new KeyUsagesExtension(KeyUsageFlags.keyCertSign | KeyUsageFlags.cRLSign, true),
      new Extension('1.3.6.1.5.5.7.1.11', false, params.siaDer),
    ],
  });

  return { keyPem: privateKeyPem, csrBase64: Buffer.from(csr.rawData).toString('base64') };
}

export async function generateInitialIdCertKeyPair(): Promise<{ privateKeyPem: string; idCertTaPem: string }> {
  const privateKeyPem = await generateRsaKeyPair();
  const idCertTaPem = await issueIdCertTa(privateKeyPem);
  return { privateKeyPem, idCertTaPem };
}

/** IdCert TA no perfil Krill (CA=true, sem keyCertSign). */
export function hasKrillStyleIdCertTa(pemCert: string): boolean {
  try {
    const cert = forge.pki.certificateFromPem(pemCert);
    const bc = cert.getExtension('basicConstraints') as { cA?: boolean } | undefined;
    const ku = cert.getExtension('keyUsage') as { keyCertSign?: boolean } | undefined;
    if (ku?.keyCertSign) return false;
    return Boolean(bc?.cA);
  } catch {
    return false;
  }
}
